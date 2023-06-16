import assert from 'node:assert';
import { io } from "socket.io-client";
import { SocketMessage, SocketMessageType } from '../lib/socket_types';

const url = process.env.URL || "http://localhost:3000";
const room: string = process.env.ROOM || "9ebe48c9";
const team1: number = Number(process.env.TEAM1) || 1;
const team2: number = Number(process.env.TEAM2) || 2;

type MockPlayer = {
    user_id?: string,
    username?: string,
    cards?: string[],
    round?: [number, string][],
    turn?: number,
    trump?: string,
    points?: [number, number],
    playerNumber?: number,
    team1?: [string, string],
    team2?: [string, string],
};


function generateMove(player: MockPlayer): string {
    assert(player.cards && player.round);

    for (const card of player.cards) {
        if (player.round.length === 0 || card[1] === player.round[0][1][1] || !player.cards.map(c => c[1]).includes(player.round[0][1][1])) {
            return card;
        }
    }

    return "";
}

let playerMap: Map<string, MockPlayer> = new Map();

const run = (team: number, username: string) => {
    const socket = io(url);

    let player: MockPlayer = {username: username};
    playerMap.set(username, player);

    socket.on("disconnect", (reason: any) => {
        console.log(`${username} disconnect due to ${reason}`);
    });


    socket.on("message", (message) => {
        console.log(message);
        switch (message.type) {
            case SocketMessageType.UserId: {
                assert(playerMap.has(username));
                let player: MockPlayer = playerMap.get(username) as MockPlayer;

                player.user_id = message.body.user_id;

                break;
            }

            case SocketMessageType.Teams: {
                assert(playerMap.has(username));
                let player: MockPlayer = playerMap.get(username) as MockPlayer;

                player.team1 = message.body.team1;
                player.team2 = message.body.team2;

                break;
            }

            case SocketMessageType.Deal: {
                assert(playerMap.has(username));
                let player: MockPlayer = playerMap.get(username) as MockPlayer;

                player.cards = message.body.cards;
                player.trump = message.body.trump;

                assert(player.team1 && player.team2);

                let all = [player.team1[0], player.team2[0], player.team1[1], player.team2[1]];
                player.playerNumber = all.indexOf(username) + 1;

                break;
            }

            case SocketMessageType.Play: {
                assert(playerMap.has(username));
                let player: MockPlayer = playerMap.get(username) as MockPlayer;

                player.cards = message.body.cards;

                break;
            }

            case SocketMessageType.Round: {
                assert(playerMap.has(username));
                let player: MockPlayer = playerMap.get(username) as MockPlayer;

                player.round = message.body.round;
                player.points = message.body.points;

                let turn = message.body.turn;
                if (turn === player.playerNumber) {
                    let move: string = generateMove(player);
                    assert(move && player.user_id);

                    let m: SocketMessage = {
                        type: SocketMessageType.Play,
                        body: {
                            user_id: player.user_id,
                            card: move,
                        }
                    };

                    socket.emit("message", room, m);
                }

                break;
            }

        }
    });

    let m: SocketMessage = {
        type: SocketMessageType.JoinTeam,
        body: {
            team: team,
            username: username,
        }
    };

    socket.emit("message", room, m);
}

let testIdx = 1;

for (let i = 0; i < team1; i++) {
    run(1, `test${testIdx++}`);
} 

for (let i = 0; i < team2; i++) {
    run(2, `test${testIdx++}`);
} 
