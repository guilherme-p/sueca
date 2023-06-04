import assert from 'node:assert';
import { createClient } from 'redis';
import { Server as IOServer} from 'socket.io';
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from "net";
import { randomBytes } from 'crypto';
import { SuecaServer } from '../../lib/sueca'; 
import { SocketMessage, SocketMessageType } from '../../lib/socket_types';

interface SocketServer extends HTTPServer {
  io?: IOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

const redis = createClient();

redis.on('error', err => { 
    console.log('Redis redis Error', err)
    throw new Error("redis");
});

let _ = await redis.connect();

const generateUserId = async (room: string): Promise<string> => {
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
                    let exists: boolean = await redis.sIsMember("rooms", room);

                    if (!exists) {
                        return;
                    }

                    socket.join(room);

                    let inGame: boolean = await redis.hExists(room, "game");
                    let user_id = message.body.user_id;

                    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
                    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
                    let all = [team1[0], team2[0], team1[1], team2[1]];


                    if (inGame) {
                        let game = await redis.hGet(room, "game");
                        let game_obj: SuecaServer = JSON.parse(game as string);

                        if (user_id !== undefined) {
                            let username = await redis.hGet(`${room}:id_to_username`, user_id);
                            let playing = username && all.includes(username); 

                            if (playing) {
                                let player_n = all.indexOf(username as string);
                                let cards = game_obj.cards[player_n];

                                let m: SocketMessage = {
                                    type: SocketMessageType.JoinRoom,
                                    body: {
                                        username: username,
                                        cards: cards,
                                        round: game_obj.round,
                                        turn: game_obj.turn,
                                        trump: game_obj.trump,
                                        points: game_obj.points,
                                    } 
                                }

                                socket.emit("message", m);

                                await redis.hSet(`${room}:username_to_socket`, username as string, socket.id);
                            }

                            // should not be needed since if user_id is defined you should be playing 
                            else {
                                let m: SocketMessage = {
                                    type: SocketMessageType.JoinRoom,
                                    body: {
                                        round: game_obj.round,
                                        turn: game_obj.turn,
                                        trump: game_obj.trump,
                                        points: game_obj.points,
                                    } 
                                }

                                socket.emit("message", m);
                            }

                        }

                        else {
                            let m: SocketMessage = {
                                type: SocketMessageType.JoinRoom,
                                body: {
                                    round: game_obj.round,
                                    turn: game_obj.turn,
                                    trump: game_obj.trump,
                                    points: game_obj.points,
                                } 
                            }

                            socket.emit("message", m);
                        }
                    }

                    else {
                        let m: SocketMessage = {
                            type: SocketMessageType.Teams,
                            body: {
                                team1: team1,
                                team2: team2,
                            }
                        }

                        io.to(room).emit("message", m);
                    }

                    break;
                } 

                case SocketMessageType.JoinTeam: {
                    assert(!await redis.hExists(room, "game"));

                    let username = message.body.username;
                    let team = message.body.team;
                    let user_id = message.body.user_id;

                    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
                    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
                    let players = [...team1, ...team2];

                    let n_players_team = team === 1 ? team1.length : team2.length;
                    assert(n_players_team < 4); 

                    let existing_player: boolean = user_id !== undefined && username === await redis.hGet(`${room}:id_to_username`, user_id);; 
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
                            body: {
                                user_id: user_id,
                            }
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
                        body: {
                            team1: team1,
                            team2: team2,
                        }
                    }

                    io.to(room).emit("message", m);
                    
                    break;
                }

                case SocketMessageType.LeaveTeam: {
                    assert(!await redis.hExists(room, "game"));

                    let username = message.body.username;
                    let user_id = message.body.user_id;
                    let team = message.body.team;

                    let auth: boolean = username === await redis.hGet(`${room}:id_to_username`, user_id);
                    assert(auth);

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
                        body: {
                            team1: team1,
                            team2: team2,
                        }
                    }

                    io.to(room).emit("message", m);
         
                    break;
                }

                case SocketMessageType.StartGame: {
                    assert(!await redis.hExists(room, "game"));

                    let n_team1: number = await redis.lLen(`${room}:team1`);
                    let n_team2: number = await redis.lLen(`${room}:team2`);
                    assert(n_team1 === 2 && n_team2 === 2);

                    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
                    let team2 = await redis.lRange(`${room}:team2`, 0, -1);

                    let player1_username: string = team1[0];
                    let player2_username: string = team2[0];
                    let player3_username: string = team1[1];
                    let player4_username: string = team2[1];

                    let m: SocketMessage = {
                        type: SocketMessageType.Teams,
                        body: {
                            team1: [player1_username, player3_username],
                            team2: [player2_username, player4_username],
                        }
                    };

                    io.to(room).emit("message", m);

                    let game_obj = new SuecaServer();
                    let cards: [string[], string[], string[], string[]] = game_obj.cards;

                    let player1_socket = await redis.hGet(`${room}:username_to_socket`, player1_username);
                    let player2_socket = await redis.hGet(`${room}:username_to_socket`, player2_username);
                    let player3_socket = await redis.hGet(`${room}:username_to_socket`, player3_username);
                    let player4_socket = await redis.hGet(`${room}:username_to_socket`, player4_username);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            cards: cards[0],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player1_socket as string).emit("message", m);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            cards: cards[1],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player2_socket as string).emit("message", m);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            cards: cards[2],
                            trump: game_obj.trump,
                        }
                    }

                    io.to(player3_socket as string).emit("message", m);

                    m = {
                        type: SocketMessageType.Deal,
                        body: {
                            cards: cards[3],
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

                    let user_id: string = message.body.user_id;

                    assert(await redis.hExists(`${room}:id_to_username`, user_id));
                    let username = await redis.hGet(`${room}:id_to_username`, user_id);

                    let team1 = await redis.lRange(`${room}:team1`, 0, -1);
                    let team2 = await redis.lRange(`${room}:team2`, 0, -1);
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
                            game_over: game_over,
                        }
                    };

                    io.to(room).emit("message", m);

                    if (game_over) {
                        await cleanupRoom(room);
                    }
                }
            } 
        });

        socket.on("disconnect", (reason) => {
            console.log("disconnect reason: " + reason);
            cleanupSocket(socket.id);
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

        let time_elapsed = Date.now() - (created_ts as unknown as number); 
        time_elapsed = Math.floor(time_elapsed) / 1000; // in seconds
        if (time_elapsed >= ROOM_EXPIRATION_TIME) {
            cleanupRoom(room);
        }
    }

}

async function cleanupRoom(room: string) {
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

    let username = await redis.hGet(`${room}:username_to_socket`, socket_id);

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
