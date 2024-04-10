import assert from "node:assert";
import { MyRedisClient, generateUserId, cleanupRoom } from "../pages/api/socket";
import { Socket, Server as IOServer } from "socket.io";
import {
    PlayMessage,
    SocketMessage,
    SocketMessageType,
    TeamsMessage,
} from "./socketTypes";

import { SuecaServer } from "./sueca";

export default async function playHandler(
    room: string,
    message: PlayMessage,
    io: IOServer,
    socket: Socket,
    redis: MyRedisClient,
) {
    assert(await redis.sIsMember("rooms", room));
    assert(await redis.hExists(room, "game"));
    let game = await redis.hGet(room, "game");

    let user_id: string | undefined = message.user_id;
    if (user_id === undefined) {
        return;
    }

    let card = message.card;

    assert(await redis.hExists(`${room}:id_to_username`, user_id));
    let username = await redis.hGet(`${room}:id_to_username`, user_id);

    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    let all = [team1[0], team2[0], team1[1], team2[1]];

    assert(all.includes(username!));

    let player_n = all.indexOf(username!);

    let game_obj: SuecaServer = new SuecaServer();
    game_obj.from(JSON.parse(game!));
    // console.log("game", game, game_obj);

    let game_over: boolean = game_obj.play(player_n, card);

    await redis.hSet(room, "game", JSON.stringify(game_obj));

    let m: SocketMessage = {
        type: SocketMessageType.PlayReply,
            cards: game_obj.cards[player_n],
    };

    socket.emit("message", m);

    m = {
        type: SocketMessageType.Round,
            round: game_obj.round,
            turn: game_obj.turn,
            points: game_obj.points,
            game_over: game_over,
    };

    io.to(room).emit("message", m);

    if (game_over) {
        setTimeout(() => cleanupRoom(room), 1000 * 60 * 5); // cleanup room after 5 minutes
    }
}
