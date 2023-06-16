import assert from 'node:assert';
import { getCookie, setCookie, deleteCookie, hasCookie } from 'cookies-next';
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo, Dispatch, SetStateAction, ReactNode, ReactElement } from 'react';
import { io, Socket } from "socket.io-client";
import { SocketMessage, SocketMessageType } from '../../lib/socket_types';
import cardImages from '../../lib/cardImages';
import tableImage from '../../images/table.svg';
import Image from 'next/image';

function UserCards({round, cards, activeCard, setActiveCard, validateMove, handlePlay}: 
    {
        round: [number, string][], cards: string[], activeCard: string, setActiveCard: Dispatch<SetStateAction<string>>, 
        validateMove: (card: string) => boolean, handlePlay: (card: string) => void
    }): ReactElement 
{

    return (
        <div className="my-2 flex flex-col gap-4 justify-center items-center">
            <div className="flex flex-row gap-1 container relative">
                {
                    cards.map(c => 
                        <button key={c} disabled={!validateMove(c)} onClick={() => setActiveCard(c)} 
                            className={`${activeCard === c ? "border-2 border-solid border-red-500 rounded-lg " : ""}` + "disabled:opacity-50"}>
                            {cardImages[c]}
                        </button>
                    )
                }
            </div>

            {activeCard &&
                <button onClick={ () => handlePlay(activeCard) } 
                    className="text-center text-2xl w-40 h-15 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                    font-semibold rounded-lg border-solid">
                    Jogar
                </button>

            }

        </div>
    );
}

function UserMove({round, playerNumber}: {round: [number, string][], playerNumber: number}) {
    if (! (round && round.map(([n, c]) => n).includes(playerNumber)) ) {
        return <></>;
    }

    let roundPlayerNumbers: number[] = round.map(([n, c]) => n);
    let roundPlayerCards: string[] = round.map(([n, c]) => c);

    let i: number = roundPlayerNumbers.indexOf(playerNumber);
    let card: string  = roundPlayerCards[i];

    return (
        <div className="w-20 container relative">
            {cardImages[card]}
        </div>
    );
}

function PlayScreen({room, socket, team1, team2, username, playerNumber, cards, setCards, trump, round, turn, points}:
    {
        room: string, socket: Socket, team1: string[], team2: string[], username: string, playerNumber: number, cards: string[],
        setCards: Dispatch<SetStateAction<string[]>>, trump: string, round: [number, string][], turn: number, points: number[]
    }) 

{
    let [activeCard, setActiveCard] = useState("");

    function validateMove(card: string): boolean {
        return playerNumber === turn &&
        cards.includes(card) &&
        (round.length === 0 || card[1] === round[0][1][1] || !cards.map(c => c[1]).includes(round[0][1][1]));
    }

    function handlePlay(card: string) {
        let m: SocketMessage = {
            type: SocketMessageType.Play,
            body: {
                user_id: getCookie(`sueca:${room}:user_id`),
                card: card,
            }
        }

        socket.emit("message", room, m);
        setActiveCard("");
    }

    let all: [string, number][] = [team1[0], team2[0], team1[1], team2[1]].map((element, index) => [element, index]);
    let order: [string, number][] = playerNumber > 0 ? all.slice(playerNumber - 1).concat(all.slice(0, playerNumber - 1)) : all; // bottom left top right

    let usernames: string[] = order.map(([u, n]) => u);
    let usernameNumbers: number[] = order.map(([u, n]) => n);

    return (
        <div className="container h-screen w-screen flex flex-col items-center justify-center relative">
            <div className="inline-block relative">
                <Image
                    src={tableImage}
                    alt="Card table"
                />

                <span className="absolute top-[90%] left-1/2 -translate-x-1/2 text-center">
                    {usernames[0]}
                </span>

                <div className="absolute top-[70%] left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={round} playerNumber={usernameNumbers[0]} />
                </div>

                <span className="absolute top-1/2 -translate-y-1/2 left-[10%] -translate-x-[10%]">
                    {usernames[1]}
                </span>

                <div className="absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={round} playerNumber={usernameNumbers[1]} />
                </div>

                <span className="absolute top-[10%] left-1/2 -translate-x-1/2 ">
                    {usernames[2]}
                </span>

                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={round} playerNumber={usernameNumbers[2]} />
                </div>

                <span className="absolute top-1/2 -translate-y-1/2 left-[90%] -translate-x-[90%]">
                    {usernames[3]}
                </span>

                <div className="absolute top-1/2 left-[80%] -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={round} playerNumber={usernameNumbers[3]} />
                </div>
            </div>

            {cards && <UserCards round={round} cards={cards} activeCard={activeCard} setActiveCard={setActiveCard} validateMove={validateMove} handlePlay={handlePlay}/>}

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

    let [roomExists, setRoomExists] = useState(false);

    let [inGame, setInGame] = useState(false);

    let [username, setUsername] = useState("");

    let [team1, setTeam1] = useState([] as string[]);
    let [team2, setTeam2] = useState([] as string[]);

    let [cards, setCards] = useState([] as string[]);
    let [trump, setTrump] = useState("");

    let [round, setRound] = useState([] as [number, string][]);
    let [turn, setTurn] = useState(0);
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

        socket.on("message", async (message) => {
            console.log(message);

            switch (message.type) {
                case SocketMessageType.RoomExists: {
                    let rRoom = message.body.room;

                    if (room === rRoom) {
                        setRoomExists(true);
                    } 

                    break;
                }

                case SocketMessageType.UserId: {
                    let user_id = message.body.user_id;
                    setCookie(`sueca:${room}:user_id`, user_id, {maxAge: 60 * 60 * 24});

                    break;
                }

                case SocketMessageType.Teams: {
                    let t1 = message.body.team1;
                    let t2 = message.body.team2;

                    setTeam1([...(t1 ? t1 : [])]);
                    setTeam2([...(t2 ? t2 : [])]);

                    break;
                }

                case SocketMessageType.Deal: {
                    let rCards = message.body.cards;
                    let rTrump = message.body.trump;

                    let all = [team1[0], team2[0], team1[1], team2[1]];
                    setPlayerNumber(all.indexOf(username) + 1);

                    setInGame(true);
                    setCards(rCards);
                    setTrump(rTrump);

                    break;
                }

                case SocketMessageType.Play: {
                    let rCards = message.body.cards;
                    setCards(rCards);

                    break;
                }

                case SocketMessageType.Round: {
                    let rRound = message.body.round;
                    let rTurn = message.body.turn;
                    let rPoints = message.body.points;
                    let game_over = message.body.game_over;

                    setRound(rRound);
                    setTurn(rTurn);
                    
                    if (round.length === 4 && !game_over) {
                        setTimeout(() => {
                            setRound(currentRound => currentRound.length !== 4 ? currentRound : []);
                            setPoints(currentPoints => currentPoints > rPoints ? currentPoints : rPoints);
                        }, 3000);
                    } 

                    else {
                        setPoints(rPoints);
                    }

                    if (game_over) {
                        deleteCookie(`sueca:${room}:user_id`);
                        socket.disconnect();
                    }

                    break;
                }

                case SocketMessageType.JoinRoom: {
                    setInGame(true);

                    let rUsername = message.body.username;
                    let rCards = message.body.cards;
                    let rRound = message.body.round;
                    let rTurn = message.body.turn;
                    let rTrump = message.body.trump;
                    let rPoints = message.body.points;

                    if (rUsername && rCards) {
                        setUsername(rUsername);
                        setCards(rCards);
                    }

                    setRound(rRound);
                    setTurn(rTurn);
                    setTrump(rTrump);
                    setPoints(rPoints);
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


    if (socket && room && roomExists) {
        if (!inGame) {
            return <JoinTeamScreen 
                room={room}
                socket={socket}
                team1={team1}
                team2={team2}
                username={username}
                setUsername={setUsername}
            />;
        }

        else {
            return <PlayScreen 
                room={room}
                socket={socket}
                team1={team1}
                team2={team2}
                username={username}
                playerNumber={playerNumber}
                cards={cards}
                setCards={setCards}
                trump={trump}
                round={round}
                turn={turn}
                points={points}
            />;
        }
    }
}
