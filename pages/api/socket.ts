import assert from 'node:assert';
import { createClient } from 'redis';
import { Server as IOServer} from 'socket.io';
import type { NextApiRequest } from 'next';
import { randomBytes } from 'crypto';
import { SuecaServer } from '@/lib/sueca'; 
import { NextApiResponseWithSocket, SocketMessage, SocketMessageType } from '@/lib/socketTypes';
import joinRoomHandler from '@/lib/joinRoomHandler';
import joinTeamHandler from '@/lib/joinTeamHandler';
import leaveTeamHandler from '@/lib/leaveTeamHandler';
import startGameHandler from '@/lib/startGameHandler';
import playHandler from '@/lib/playHandler';

const redis = await createClient()
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

export type MyRedisClient = typeof redis;

export const generateUserId = async (room: string): Promise<string> => {
    let user_id: string = randomBytes(32).toString('hex');
    let existing = await redis.hKeys(`${room}:id_to_username`);  

    while (existing.includes(user_id)) {
        user_id = randomBytes(32).toString('hex');
        existing = await redis.hKeys(`${room}:id_to_username`);  
    }

    return user_id;
}

export default async function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (res.socket.server.io) {
        console.log('Socket is already running');

        res.end();
        return;
    } 

    console.log('Socket is initializing');
    res.socket.server.io = new IOServer(res.socket.server);

    const io = res.socket.server.io;
    io.on("connection", (socket) => {
        socket.on("message", async (room, message) => {
            console.log(room, message, socket.id);

            switch (message.type) {
                case SocketMessageType.JoinRoom: {
                    joinRoomHandler(room, message, socket, redis);
                    break;
                }

                case SocketMessageType.JoinTeam: {
                    joinTeamHandler(room, message, io, socket, redis);
                    break;
                }

                case SocketMessageType.LeaveTeam: {
                    leaveTeamHandler(room, message, io, socket, redis);
                    break;
                }

                case SocketMessageType.StartGame: {
                    startGameHandler(room, message, io, socket, redis);
                    break;
                }

                case SocketMessageType.Play: {
                    playHandler(room, message, io, socket, redis);
                    break;
                }
            } 
        });

        socket.on("disconnect", (reason) => {
            console.log("disconnect reason: " + reason);
            // cleanupSocket(socket.id);
        });

    });

    res.end();
}

const ROOM_EXPIRATION_TIME = 60 * 60; // seconds
const CLEANUP_INTERVAL = 60 * 60 // seconds

setInterval(cleanupRooms, CLEANUP_INTERVAL);

async function cleanupRooms() {
    let rooms = await redis.sMembers("rooms");

    for (const room of rooms) {
        let created_ts = await redis.hGet(room, "created_ts");

        if (!created_ts) {
            continue;
        }

        let time_elapsed = Date.now() - parseInt(created_ts); 
        time_elapsed = Math.floor(time_elapsed) / 1000; // in seconds
        if (time_elapsed >= ROOM_EXPIRATION_TIME) {
            cleanupRoom(room);
        }
    }

}

export async function cleanupRoom(room: string) {
    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    let all = [team1[0], team2[0], team1[1], team2[1]];

    for (const username of all) {
        cleanupUsername(room, username);
    }

    await redis.hDel(room, "created_ts");
    await redis.hDel(room, "game");
    await redis.sRem("rooms", room);
}

async function cleanupUsername(room: string, username: string) {
    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    let all = [team1[0], team2[0], team1[1], team2[1]];

    let player_n = all.indexOf(username);
    let team_n = (player_n % 2) + 1;

    let user_id = await redis.hGet(`${room}:username_to_id`, username);
    let socket_id = await redis.hGet(`${room}:username_to_socket`, username);

    await redis.hDel(`${room}:username_to_socket`, username);
    await redis.hDel(`${room}:socket_to_username`, socket_id as string);
    await redis.hDel(`socket_to_room`, socket_id as string);
    await redis.hDel(`${room}:id_to_username`, user_id as string);
    await redis.hDel(`${room}:username_to_id`, username);
    await redis.lRem(`${room}:team${team_n}`, 0, username); 
}

async function cleanupSocket(socket_id: string) {
    let room = await redis.hGet(`socket_to_room`, socket_id);

    if (!room) {
        return;
    }

    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
    let all = [team1[0], team2[0], team1[1], team2[1]];

    let username = await redis.hGet(`${room}:socket_to_username`, socket_id);

    let player_n = all.indexOf(username as string);
    let team_n = (player_n % 2) + 1;

    let user_id = await redis.hGet(`${room}:username_to_id`, username as string);

    await redis.hDel(`socket_to_room`, socket_id);
    await redis.hDel(`${room}:username_to_socket`, username as string);
    await redis.hDel(`${room}:socket_to_username`, socket_id);
    await redis.hDel(`${room}:id_to_username`, user_id as string);
    await redis.hDel(`${room}:username_to_id`, username as string);
    await redis.lRem(`${room}:team${team_n}`, 0, username as string); 
}
