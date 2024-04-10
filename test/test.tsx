import assert from "node:assert";
import { io } from "socket.io-client";
import { SocketMessage, SocketMessageType } from "@/lib/socketTypes";

const url = process.env.URL || "http://localhost:3000";
const room: string = process.env.ROOM || "b2090b36";
const n_team1: number = Number(process.env.N_TEAM1) || 1;
const n_team2: number = Number(process.env.N_TEAM2) || 2;

type MockPlayer = {
    user_id?: string;
    username?: string;
    cards?: string[];
    round?: [number, string][];
    turn?: number;
    trump?: string;
    points?: [number, number];
    playerNumber?: number;
    team1?: [string, string];
    team2?: [string, string];
    game_over?: boolean;
};

const sleep = (waitTimeInMs: number) =>
    new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

function generateMove(player: MockPlayer): string {
    assert(player.cards && player.round);

    for (const card of player.cards) {
        if (
            player.round.length === 0 ||
            card[1] === player.round[0][1][1] ||
            !player.cards.map((c) => c[1]).includes(player.round[0][1][1])
        ) {
            return card;
        }
    }

    return "";
}

let playerMap: Map<string, MockPlayer> = new Map();

const run = (team: number, username: string) => {
    const socket = io(url);

    let player: MockPlayer = { username: username };
    playerMap.set(username, player);

    socket.on("disconnect", (reason: any) => {
        console.log(`${username} disconnect due to ${reason}`);
    });

    socket.on("message", async (message) => {
        console.log(message, message.round);
        assert(playerMap.has(username));
        let player: MockPlayer = playerMap.get(username)!;
        console.log(player);
        console.log("");

        switch (message.type) {
            case SocketMessageType.UserId: {
                player.user_id = message.user_id;

                break;
            }

            case SocketMessageType.Teams: {
                player.team1 = message.team1;
                player.team2 = message.team2;

                break;
            }

            case SocketMessageType.Deal: {
                player.cards = message.cards;
                player.trump = message.trump;

                assert(player.team1 && player.team2);

                let all = [
                    player.team1[0],
                    player.team2[0],
                    player.team1[1],
                    player.team2[1],
                ];
                player.playerNumber = all.indexOf(username);

                break;
            }

            case SocketMessageType.PlayReply: {
                player.cards = message.cards;

                break;
            }

            case SocketMessageType.Round: {
                player.round = message.round;
                player.points = message.points;
                player.game_over = message.game_over;

                if (player.game_over) {
                    socket.disconnect();
                    return;
                }

                if (player.round?.length === 4) {
                    player.round = [];
                }

                let turn = message.turn;
                if (turn === player.playerNumber) {
                    let move: string = generateMove(player);
                    assert(move && player.user_id);

                    let m: SocketMessage = {
                        type: SocketMessageType.Play,
                        user_id: player.user_id,
                        card: move,
                    };

                    await sleep(2000);
                    socket.emit("message", room, m);
                }

                break;
            }
        }
    });

    let m: SocketMessage = {
        type: SocketMessageType.JoinRoom,
    };

    socket.emit("message", room, m);

    m = {
        type: SocketMessageType.JoinTeam,
        team: team,
        username: username,
    };

    socket.emit("message", room, m);
};

let testIdx = 1;

for (let i = 0; i < n_team1; i++) {
    run(1, `test${testIdx++}`);
}

for (let i = 0; i < n_team2; i++) {
    run(2, `test${testIdx++}`);
}
