import assert from 'node:assert';
import { MyRedisClient, generateUserId } from "../pages/api/socket"
import { Socket, Server as IOServer } from "socket.io";
import {
    LeaveTeamMessage,
    SocketMessage,
    SocketMessageType,
    TeamsMessage,
} from "./socketTypes";

export default async function leaveTeamHandler(
    room: string,
    message: LeaveTeamMessage,
    io: IOServer,
    socket: Socket,
    redis: MyRedisClient,
) {

    assert(await redis.sIsMember("rooms", room));
    assert(!await redis.hExists(room, "game"));

    let username = message.username;
    let user_id = message.user_id;
    let team = message.team;

    let auth: boolean = username === await redis.hGet(`${room}:id_to_username`, user_id);
    assert(auth);

    let team_arr = await redis.lRange(`${room}:team${team}`, 0, -1);
    assert(team_arr.includes(username));

    await redis.hDel(`socket_to_room`, socket.id);
    await redis.hDel(`${room}:username_to_socket`, username);
    await redis.hDel(`${room}:socket_to_username`, socket.id);
    await redis.hDel(`${room}:id_to_username`, user_id);
    await redis.hDel(`${room}:username_to_id`, username);
    await redis.lRem(`${room}:team${team}`, 0, username); 

    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);

    let m: SocketMessage = {
        type: SocketMessageType.Teams,
        team1: team1,
        team2: team2,
    }

    io.to(room).emit("message", m);
}
