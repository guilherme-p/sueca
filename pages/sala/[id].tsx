import assert from 'node:assert';
import { getCookie, setCookie, deleteCookie, hasCookie } from 'cookies-next';
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, Dispatch, SetStateAction, ReactNode, ReactElement } from 'react';
import { io, Socket } from "socket.io-client";
import { SocketMessage, SocketMessageType } from '../../lib/socket_types';
import cardImages from '../../lib/cardImages';
import tableImage from '../../images/table.svg';
import Image from 'next/image';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function UserCards({round, cards, setCards}: {round: [number, string][], cards: string[], setCards: Dispatch<SetStateAction<string[]>>}): ReactElement {

}

function UserMove({round, usernameNumber}: {round: [number, string][], usernameNumber: number}): ReactElement {
    if (! (round && round.map(([n, c]) => n).includes(usernameNumber)) ) {
        return <></>;
    }

    let roundUsernameNumbers: number[] = round.map(([n, c]) => n);
    let roundUsernameCard: string[] = round.map(([n, c]) => c);

    let i: number = roundUsernameNumbers.indexOf(usernameNumber);
    let card: string  = roundUsernameCard[i];

    return cardImages[card];
}

function PlayScreen({room, socket, team1, team2, username, playerNumber, cards, setCards, trump, round, turn, points}:
    {
        room: string, socket: Socket, team1: string[], team2: string[], username: string, playerNumber: number, cards: string[],
        setCards: Dispatch<SetStateAction<string[]>>, trump: string, round: [number, string][], turn: number, points: number[]}
    ) 

{
    let all: [string, number][] = [team1[0], team2[0], team1[1], team2[1]].map((element, index) => [element, index]);
    let order: [string, number][] = all.slice(playerNumber - 1).concat(all.slice(0, playerNumber - 1)); // bottom left top right

    let usernames: string[] = order.map(([u, n]) => u);
    let usernameNumbers: number[] = order.map(([u, n]) => n);

    return (
        <div className="container table relative mx-auto my-auto">
            <Image
                src={tableImage}
                alt="Card table"
            />

            <span className="absolute">
                {usernames[0]}
            </span>

            <div>
                <UserMove round={round} usernameNumber={usernameNumbers[0]} />
            </div>

            <div>
                <UserCards round={round} cards={cards} setCards={setCards} />
            </div>

            <span className="absolute">
                {usernames[1]}
            </span>

            <div>
                <UserMove round={round} usernameNumber={usernameNumbers[1]} />
            </div>

            <span className="absolute">
                {usernames[2]}
            </span>

            <div>
                <UserMove round={round} usernameNumber={usernameNumbers[2]} />
            </div>

            <span className="absolute">
                {usernames[3]}
            </span>

            <div>
                <UserMove round={round} usernameNumber={usernameNumbers[3]} />
            </div>

        </div>
    );
}

function JoinTeamScreen({room, socket, team1, team2, username, setUsername}:
    {room: string, socket: Socket, team1: string[], team2: string[], username: string, setUsername: Dispatch<SetStateAction<string>>}) 

{
    function joinTeam(team: number) {
        if (!username) {
            alert("Precisas de um username para jogar!");
            return;
        }

        if ( (team === 1 && team1.includes(username)) || (team === 2 && team2.includes(username)) ) {
            alert("Username duplicado");
            return;
        }

        let user_id = getCookie(`sueca:${room}:user_id`);

        let m: SocketMessage = {
            type: SocketMessageType.JoinTeam,
            body: {
                team: team,
                username: username,
                user_id: user_id,
            }
        };

        socket.emit("message", room, m);
    }


    function leaveTeam(team: number) {
        let user_id = getCookie(`sueca:${room}:user_id`);

        let m: SocketMessage = {
            type: SocketMessageType.LeaveTeam,
            body: {
                team: team,
                username: username,
                user_id: user_id,
            }
        };

        socket.emit("message", room, m);
        deleteCookie(`sueca:${room}:user_id`);
    }

    function startGame() {
        let m: SocketMessage = {
            type: SocketMessageType.StartGame,
        };

        socket.emit("message", room, m);
    }

    function onUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
        setUsername(event.target.value);
    }

    return (
        <div className="container flex flex-col items-center w-screen h-screen">
            <div className="container flex h-10 w-48 mt-8">
                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600
                    dark:text-gray-400 dark:border-gray-600">
                    @
                </span>
                <input type="text" id="username" maxLength={16} 
                    disabled={team1.includes(username) || team2.includes(username)} 
                    value={username}
                    onChange={onUsernameChange} 
                    className="rounded-none rounded-r-lg bg-gray-50 border text-gray-900 focus:ring-blue-500 focus:border-blue-500 w-full text-sm border-gray-300 p-2.5
                    dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="username" />
            </div>

            <div className="container flex flex-row gap-8 w-8/12 mx-auto my-12 items-center justify-center">
                <div className="team1 container rounded-md h-80 w-72 bg-blue-100 shadow-lg">
                    <div className="container flex flex-col gap-2 items-center justify-center">
                        <h1 className="mt-4 text-2xl text-center font-bold">
                            Equipa Azul
                        </h1>

                        {team1.length > 0 && team1.map(u1 => {
                            return <span key={u1} className="bg-gray-200 rounded-full px-3 py-1 text-center text-sm font-semibold text-gray-700 mr-2 mb-2">@{u1}</span>
                        })}

                        {!team1.includes(username) && team1.length < 4 &&
                            <button onClick={ () => joinTeam(1) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Juntar
                            </button>
                        }

                        {team1.includes(username) && 
                            <button onClick={ () => leaveTeam(1) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Sair
                            </button>
                        }
                    </div>
                </div>

                <div className="team2 container rounded-md h-80 w-72 bg-orange-100 shadow-lg">
                    <div className="container flex flex-col gap-2 content-center items-center ">
                        <h1 className="mt-4 text-2xl text-center font-bold">
                            Equipa Laranja
                        </h1>

                        {team2.length > 0 && team2.map(u2 => {
                            return <span key={u2} className="bg-gray-200 rounded-full px-3 py-1 text-center text-sm font-semibold text-gray-700 mr-2 mb-2">@{u2}</span>
                        })}

                        {!team2.includes(username) && team2.length < 4 &&
                            <button onClick={ () => joinTeam(2) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Juntar
                            </button>
                        }

                        {team2.includes(username) && 
                            <button onClick={ () => leaveTeam(2) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Sair
                            </button>
                        }

                    </div>
                </div>
            </div>

            {(team1.includes(username) || team2.includes(username)) && team1.length === 2 && team2.length === 2 &&
                <button onClick={startGame} 
                    className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                    font-semibold rounded-lg border-solid">
                    Começar jogo
                </button>
            }

        </div>
    ); 
}

export default function Page() {
    const router = useRouter();
    const { id } = router.query;
    const room = id ? (Array.isArray(id) ? id[0] : id) : ""; // query string can be longer than one param, even though it shouldnt

    let [inGame, setInGame] = useState(false);

    let [username, setUsername] = useState("");

    let [team1, setTeam1] = useState([] as string[]);
    let [team2, setTeam2] = useState([] as string[]);

    let [cards, setCards] = useState([] as string[]);
    let [trump, setTrump] = useState("");

    let [round, setRound] = useState([] as string[]);
    let [turn, setTurn] = useState(1);
    let [playerNumber, setPlayerNumber] = useState(0);
    let [points, setPoints] = useState([0, 0]);

    let [socket, setSocket] = useState<Socket | undefined>(undefined);

    useEffect(() => {
        if (room) {
            initSocket();
        }

        return () => {
            if (socket && !socket.disconnected) {
                socket.disconnect();
            }
        };
    }, [room]); // router.query is hydrated after initial page load, so room starts off empty

    async function initSocket() {
        await fetch("/api/socket");
        let socket = io();

        socket.on("message", (message) => {
            console.log(message);
            switch (message.type) {
                case SocketMessageType.UserId: {
                    let user_id = message.body.user_id;
                    setCookie(`sueca:${room}:user_id`, user_id, {maxAge: 60 * 60 * 24});
                }

                case SocketMessageType.Teams: {
                    let t1 = message.body.team1;
                    let t2 = message.body.team2;

                    setTeam1([...(t1 ? t1 : [])]);
                    setTeam2([...(t2 ? t2 : [])]);

                    break;
                }

                case SocketMessageType.Deal: {
                    let cards = message.body.cards;
                    let trump = message.body.trump;

                    let all = [team1[0], team2[0], team1[1], team2[1]];
                    setPlayerNumber(all.indexOf(username) + 1);

                    setInGame(true);
                    setCards(cards);
                    setTrump(trump);

                    break;
                }

                case SocketMessageType.Round: {
                    let newRound = message.body.round;
                    let newTurn = message.body.turn;
                    let newPoints = message.body.points;
                    let game_over = message.body.game_over;

                    setRound(newRound);
                    
                    if (round.length === 4 && !game_over) {
                        setTurn(newTurn);
                        await sleep(3000);

                        setRound([]);
                        setPoints(newPoints);
                    } 

                    else {
                        setTurn(newTurn);
                        setPoints(newPoints);
                    }

                    if (game_over) {
                        deleteCookie(`sueca:${room}:user_id`);
                        socket.disconnect();
                    }

                    break;
                }
            }

        });

        let user_id = getCookie(`sueca:${room}:user_id`);

        let m: SocketMessage = {
            type: SocketMessageType.JoinRoom,
            body: {
                user_id: user_id,
            }
        };

        // console.log(room, m);
        socket.emit("message", room, m);

        setSocket(socket);
    }

    if (!inGame) {
        if (socket && room) {
            return <JoinTeamScreen 
                        room={room}
                        socket={socket}
                        team1={team1}
                        team2={team2}
                        username={username}
                        setUsername={setUsername}
                    />;
        }
    }

    else {
        // nothing
    }

}
