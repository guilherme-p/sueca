import assert from 'node:assert';
import { MyRedisClient, generateUserId } from "../pages/api/socket"
import { Socket, Server as IOServer } from "socket.io";
import {
    JoinTeamMessage,
    SocketMessage,
    SocketMessageType,
    TeamsMessage,
} from "./socketTypes";

export default async function joinTeamHandler(
    room: string,
    message: JoinTeamMessage,
    io: IOServer,
    socket: Socket,
    redis: MyRedisClient,
) {
    assert(await redis.sIsMember("rooms", room));
    assert(!await redis.hExists(room, "game"));

    let username = message.username;
    let team = message.team;
    let user_id = message.user_id;

    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    let players = [...team1, ...team2];

    let n_players_team = team === 1 ? team1.length : team2.length;
    assert(n_players_team < 4); 

    let existing_player: boolean = user_id !== undefined && username === await redis.hGet(`${room}:id_to_username`, user_id); 
    let new_player: boolean = !existing_player;

    if (new_player) {
        let username_taken: boolean = players.includes(username);

        if (username_taken) {
            let m: SocketMessage = {
                type: SocketMessageType.UsernameTaken,
            };

            socket.emit("message", m);
            return;
        }

        let user_id = await generateUserId(room);

        await redis.hSet(`${room}:id_to_username`, user_id, username);
        await redis.hSet(`${room}:username_to_id`, username, user_id);

        let m: SocketMessage = {
            type: SocketMessageType.UserId,
            user_id: user_id,
        };

        socket.emit("message", m);
    } 

    else {
        let last_team = team === 1 ? team2 : team1;
        let last_team_n: number = team === 1 ? 2 : 1; 

        assert(last_team.includes(username));
        await redis.lRem(`${room}:team${last_team_n}`, 0, username);
    }

    await redis.rPush(`${room}:team${team}`, username);
    await redis.hSet(`socket_to_room`, socket.id, room);
    await redis.hSet(`${room}:username_to_socket`, username, socket.id);
    await redis.hSet(`${room}:socket_to_username`, socket.id, username);

    team1 = await redis.lRange(`${room}:team1`, 0, -1);
    team2 = await redis.lRange(`${room}:team2`, 0, -1);

    let m: SocketMessage = {
        type: SocketMessageType.Teams,
        team1: team1,
        team2: team2,
    }

    io.to(room).emit("message", m);
}
