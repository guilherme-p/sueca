import assert from 'node:assert';
import { createClient } from 'redis';
import { Server as IOServer} from 'Socket.IO';
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from "net";
import { getCookie, setCookie, deleteCookie, hasCookie } from 'cookies-next';
import { randomBytes } from 'crypto';
import { SuecaServer } from '../../lib/sueca'; 

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
    Deal,
    Play,
    Round,
    GameOver,
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
                    assert(!await redis.hExists(room, "game"));

                    let username = message.body.username;
                    let team = message.body.team;

                    let n_players: number = await redis.sCard(`${room}:username_to_id`);
                    let existing_player: boolean = false;

                    let user_id = getCookie(`sueca:${room}:user_id`, {req, res});

                    if (user_id === undefined) {
                        assert(n_players < 4); 

                        let existing_usernames: string[] = await redis.hKeys(`${room}:username_to_id`);
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

                        await redis.hSet(`${room}:id_to_username`, user_id, username);
                        await redis.hSet(`${room}:username_to_id`, username, user_id);
                        await redis.hSet(`${room}:sockets`, username, socket.id);

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
                    assert(!await redis.hExists(room, "game"));

                    let username = message.body.username;
                    let team = message.body.team;

                    let user_id = await redis.hGet(`${room}:username_to_id`, username);

                    await redis.hDel(`${room}:username_to_id`, username); 
                    await redis.hDel(`${room}:id_to_username`, user_id as string); 
                    await redis.sRem(`${room}:team${team}`, username); 

                    deleteCookie(`sueca:${room}:user_id`, {req, res});

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
                    assert(!await redis.hExists(room, "game"));

                    let n_team1: number = await redis.sCard(`${room}:team1`);
                    let n_team2: number = await redis.sCard(`${room}:team2`);
                    assert(n_team1 === 2 && n_team2 === 2);

                    let team1 = await redis.sMembers(`${room}:team1`);
                    let team2 = await redis.sMembers(`${room}:team2`);

                    let player1_username: string = team1[0];
                    let player2_username: string = team2[0];
                    let player3_username: string = team1[1];
                    let player4_username: string = team2[1];

                    let m: SocketMessage = {
                        type: SocketMessageType.StartGame,
                        body: {
                            team1: [player1_username, player3_username],
                            team2: [player2_username, player4_username],
                        }
                    };

                    io.to(room).emit("message", m);

                    let game_obj = new SuecaServer();
                    let decks: [string[], string[], string[], string[]] = game_obj.deal();

                    let player1_socket = await redis.hGet(`${room}:sockets`, player1_username);
                    let player2_socket = await redis.hGet(`${room}:sockets`, player2_username);
                    let player3_socket = await redis.hGet(`${room}:sockets`, player3_username);
                    let player4_socket = await redis.hGet(`${room}:sockets`, player4_username);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            deck: decks[0],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player1_socket as string).emit("message", m);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            deck: decks[1],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player2_socket as string).emit("message", m);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            deck: decks[2],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player3_socket as string).emit("message", m);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            deck: decks[3],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player4_socket as string).emit("message", m);

                    await redis.hSet(room, "game", JSON.stringify(game_obj));

                    break;
                }

                case SocketMessageType.Play: {
                    assert(await redis.hExists(room, "game"));
                    let game = await redis.hGet(room, "game");

                    assert(hasCookie(`sueca:${room}:user_id`, {req, res}));
                    let user_id = getCookie(`sueca:${room}:user_id`, {req, res});

                    assert(await redis.hExists(`${room}:id_to_username`, user_id as string));
                    let username = await redis.hGet(`${room}:id_to_username`, user_id as string);

                    let team1 = await redis.sMembers(`${room}:team1`);
                    let team2 = await redis.sMembers(`${room}:team2`);
                    let all = [team1[0], team2[0], team1[1], team2[1]];

                    assert(all.includes(username as string));

                    let player_n = all.indexOf(username as string);
                    let card = message.body.card;

                    let game_obj: SuecaServer = JSON.parse(game as string);
                    let game_over: boolean = game_obj.play(player_n, card);

                    await redis.hSet(room, "game", JSON.stringify(game));

                    let m: SocketMessage = {
                        type: SocketMessageType.Round,
                        body: {
                            round: game_obj.round,
                            turn: game_obj.turn,
                            points: game_obj.points,
                            trump: game_obj.trump,
                        }
                    };

                    io.to(room).emit("message", m);

                    if (game_over) {
                        let m: SocketMessage = {
                            type: SocketMessageType.GameOver,
                        };

                        io.to(room).emit("message", m);
                    }
                    
                }
            } 
        });
    });


    res.end();
}
