import { MyRedisClient } from "../pages/api/socket"
import { Socket } from "socket.io";
import {
    JoinRoomMessage,
    SocketMessage,
    SocketMessageType,
    TeamsMessage,
} from "./socketTypes";

import { SuecaServer } from "./sueca";

export default async function joinRoomHandler(
    room: string,
    message: JoinRoomMessage,
    socket: Socket,
    redis: MyRedisClient,
) {
    let exists: boolean = await redis.sIsMember("rooms", room);

    let m: SocketMessage = {
        type: SocketMessageType.RoomExists,
        exists: exists,
    };

    socket.emit("message", m);

    if (!exists) {
        return;
    }

    socket.join(room);

    let inGame: boolean = await redis.hExists(room, "game");
    let user_id = message.user_id;

    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    let all = [team1[0], team2[0], team1[1], team2[1]];

    m = {
        type: SocketMessageType.Teams,
        team1: team1,
        team2: team2,
    };

    socket.emit("message", m);

    let username: string | undefined;

    if (user_id !== undefined) {
        username = await redis.hGet(`${room}:id_to_username`, user_id);
    }

    if (inGame) {
        let game = await redis.hGet(room, "game");
        let game_obj: SuecaServer = new SuecaServer();
        game_obj.from(JSON.parse(game!));

        let playing: boolean =
            username !== undefined && username !== "" && all.includes(username);
        let cards;
        console.log(all, username, playing);

        if (playing) {
            let player_n = all.indexOf(username as string);
            cards = game_obj.cards[player_n];
            // await redis.hSet(
            //     `${room}:username_to_socket`,
            //     username as string,
            //     socket.id,
            // );
        }

        let m: SocketMessage = {
            type: SocketMessageType.JoinRoomReply,
            username: username,
            cards: cards,
            round: game_obj.round,
            turn: game_obj.turn,
            trump: game_obj.trump,
            points: game_obj.points,
        };

        socket.emit("message", m);
    }

    else if (username !== undefined) {
        m = {
            type: SocketMessageType.JoinRoomReply,
            username: username,
        }

        socket.emit("message", m);
    }
}
