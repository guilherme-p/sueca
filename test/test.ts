const { io } = require("socket.io-client");
import { SocketMessage, SocketMessageType } from '../lib/socket_types';

const url = process.env.URL || "http://localhost:3000";
const room: string = process.env.ROOM || "";
const team1: number = Number(process.env.TEAM1) || 1;
const team2: number = Number(process.env.TEAM2) || 2;


const run = (team: number, username: string) => {
    const socket = io(url);

    let m: SocketMessage = {
        type: SocketMessageType.JoinTeam,
        body: {
            team: team,
            username: username,
        }
    };

    socket.emit("message", room, m);

    socket.on("disconnect", (reason: any) => {
        console.log(`${username} disconnect due to ${reason}`);
    });
}

let testIdx = 1;

for (let i = 0; i < team1; i++) {
    run(1, `test${testIdx++}`);
} 

for (let i = 0; i < team2; i++) {
    run(2, `test${testIdx++}`);
} 
