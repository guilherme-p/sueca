import assert from 'node:assert';
import { useRouter } from "next/router";
import { createClient } from 'redis';
import { Server as IOServer} from 'Socket.IO';
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from "net";

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

await redis.connect();

async function SocketHandler(req: NextApiRequest, res: NextApiResponseWithSocket) {
    if (res.socket.server.io) {
        console.log('Socket is already running');
    } 

    else {
        console.log('Socket is initializing');
        res.socket.server.io = new IOServer(res.socket.server);
    }

    const router = useRouter();
    const {id} = router.query;


    const io = res.socket.server.io;
    io.on("connection", (socket) => {
        socket.on("join room", async (room) => {
            let exists: number = await redis.exists(room);

            if (exists !== 0) {
                socket.join(room);
            }
        });

        socket.on("join team", async (room, team, username) => {
            let other_team: number = team === 1 ? 0 : 1; 

            let n_players: number = await redis.sCard(`${room}:players`);
            let existing_player: boolean = await redis.sIsMember(`${room}:players`, username);
            assert(n_players < 4 || n_players === 4 && existing_player);

            if (existing_player) {
                await redis.sRem(`${room}:team${other_team}`, username);
                socket.to(room).emit(`leave team ${username} ${team}`);
            }

            await redis.sAdd(`${room}:team${team}`, username);

            socket.to(room).emit(`join team ${username} ${team}`);
        });

        socket.on("spectate", async (room, team, username) => {
            await redis.sRem(`${room}:players`, username); 
            await redis.sRem(`${room}:team${team}`, username); 
            socket.to(room).emit(`leave team ${username} ${team}`);
        });

        socket.on("start game", async (room) => {
            let n_team1: number = await redis.sCard(`${room}:team1`);
            let n_team2: number = await redis.sCard(`${room}:team2`);
            assert(n_team1 === 2 && n_team2 === 2);


            io.to(room).emit("start game");
        });
    });


    res.end();
}

export default SocketHandler
