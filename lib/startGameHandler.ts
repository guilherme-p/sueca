import assert from "node:assert";
import { MyRedisClient, generateUserId } from "../pages/api/socket";
import { Socket, Server as IOServer } from "socket.io";
import {
    StartGameMessage,
    SocketMessage,
    SocketMessageType,
    TeamsMessage,
} from "./socketTypes";

import { SuecaServer } from "./sueca";

export default async function startGameHandler(
    room: string,
    message: StartGameMessage,
    io: IOServer,
    socket: Socket,
    redis: MyRedisClient,
) {
    let username = message.username;
    let user_id = message.user_id;

    let auth: boolean =
        username === (await redis.hGet(`${room}:id_to_username`, user_id));
    assert(auth);

    assert(await redis.sIsMember("rooms", room));
    assert(!(await redis.hExists(room, "game")));

    let n_team1: number = await redis.lLen(`${room}:team1`);
    let n_team2: number = await redis.lLen(`${room}:team2`);
    assert(n_team1 === 2 && n_team2 === 2);

    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    assert(team1.includes(username) || team2.includes(username));

    let player1_username: string = team1[0];
    let player2_username: string = team2[0];
    let player3_username: string = team1[1];
    let player4_username: string = team2[1];

    let m: SocketMessage = {
        type: SocketMessageType.Teams,
        team1: [player1_username, player3_username],
        team2: [player2_username, player4_username],
    };

    io.to(room).emit("message", m);

    let game_obj = new SuecaServer();
    game_obj.start();

    let cards: [string[], string[], string[], string[]] = game_obj.cards;

    let player1_socket = await redis.hGet(
        `${room}:username_to_socket`,
        player1_username,
    );
    let player2_socket = await redis.hGet(
        `${room}:username_to_socket`,
        player2_username,
    );
    let player3_socket = await redis.hGet(
        `${room}:username_to_socket`,
        player3_username,
    );
    let player4_socket = await redis.hGet(
        `${room}:username_to_socket`,
        player4_username,
    );

    m = {
        type: SocketMessageType.Deal,
        cards: cards[0],
        trump: game_obj.trump,
    };

    io.to(player1_socket!).emit("message", m);

    m = {
        type: SocketMessageType.Deal,
        cards: cards[1],
        trump: game_obj.trump,
    };

    io.to(player2_socket!).emit("message", m);

    m = {
        type: SocketMessageType.Deal,
        cards: cards[2],
        trump: game_obj.trump,
    };

    io.to(player3_socket!).emit("message", m);

    m = {
        type: SocketMessageType.Deal,
        cards: cards[3],
        trump: game_obj.trump,
    };

    io.to(player4_socket!).emit("message", m);

    await redis.hSet(room, "game", JSON.stringify(game_obj));
}
