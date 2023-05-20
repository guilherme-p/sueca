import assert from 'node:assert';
import { createClient } from 'redis';
import { Server as IOServer} from 'Socket.IO';
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from "net";
import { getCookie, setCookie } from 'cookies-next';
import { randomBytes } from 'crypto';

interface SocketServer extends HTTPServer {
  io?: IOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

enum SocketMessageType {
    UsernameTaken,
    JoinRoom,
    JoinTeam,
    LeaveTeam,
    StartGame,
}  

interface SocketMessage {
    type: SocketMessageType;
    body?: Object | undefined;
}

const redis = createClient();
redis.on('error', err => { 
    console.log('Redis redis Error', err)
    throw new Error("redis");
});

await redis.connect();

export default async function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (res.socket.server.io) {
        console.log('Socket is already running');
    } 

    else {
        console.log('Socket is initializing');
        res.socket.server.io = new IOServer(res.socket.server);
    }

    const io = res.socket.server.io;
    io.on("connection", (socket) => {
        socket.on("message", async (room, message) => {
            switch (message.type) {
                case SocketMessageType.JoinRoom: {
                    let exists: number = await redis.exists(room);

                    if (exists !== 0) {
                        socket.join(room);
                    }

                    break;
                } 

                case SocketMessageType.JoinTeam: {
                    let username = message.body.username;
                    let team = message.body.team;

                    let n_players: number = await redis.sCard(`${room}:players`);
                    let existing_player: boolean = false;

                    let user_id = getCookie(`sueca:${room}:user_id`, {req, res});

                    if (user_id === undefined) {
                        assert(n_players < 4); 

                        let existing_usernames: string[] = await redis.hVals(`${room}:usernames`);
                        let username_taken: boolean = existing_usernames.includes(username);

                        if (username_taken) {
                            let m: SocketMessage = {
                                type: SocketMessageType.UsernameTaken,
                            };

                            socket.emit("message", m);
                            return;
                        }

                        user_id = randomBytes(32).toString('hex');
                        let added: number | null = await redis.sAdd(`${room}:players`, user_id);
                        
                        while (added === 0) {
                            user_id = randomBytes(32).toString('hex');
                            added = await redis.sAdd(`${room}:players`, user_id);
                            
                        }

                        await redis.hSet(`${room}:usernames`, user_id, username);

                        setCookie(`sueca:${room}:user_id`, user_id, {req, res});

                    } 

                    else {
                        existing_player = true;
                        assert(n_players <= 4); 
                    }

                    let other_team: number = team === 1 ? 0 : 1; 


                    if (existing_player) {
                        await redis.sRem(`${room}:team${other_team}`, username);

                        let m: SocketMessage = {
                            type: SocketMessageType.LeaveTeam,
                            body: {
                                username: username,
                                team: team,
                            }
                        };

                        io.to(room).emit("message", m);
                    }

                    await redis.sAdd(`${room}:team${team}`, username);

                    let m: SocketMessage = {
                        type: SocketMessageType.JoinTeam,
                        body: {
                            username: username,
                            team: team,
                        }
                    }

                    io.to(room).emit("message", m);
                    
                    break;

                }

                case SocketMessageType.LeaveTeam: {
                    let username = message.body.username;
                    let team = message.body.team;

                    await redis.sRem(`${room}:players`, username); 
                    await redis.sRem(`${room}:team${team}`, username); 

                    let m: SocketMessage = {
                        type: SocketMessageType.LeaveTeam,
                        body: {
                            username: username,
                            team: team,
                        }
                    };

                    io.to(room).emit("message", m);
         
                    break;
                }

                case SocketMessageType.StartGame: {
                    let n_team1: number = await redis.sCard(`${room}:team1`);
                    let n_team2: number = await redis.sCard(`${room}:team2`);
                    assert(n_team1 === 2 && n_team2 === 2);

                    let m: SocketMessage = {
                        type: SocketMessageType.StartGame,
                    };

                    io.to(room).emit("message", m);

                    break;
                }
            } 
        });
    });


    res.end();
}
