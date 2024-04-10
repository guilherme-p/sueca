import assert from 'node:assert';
import { getCookie, setCookie, deleteCookie, hasCookie, CookieValueTypes } from 'cookies-next';
import { useRouter } from 'next/router'
import { useState, useEffect, useRef, useReducer, Dispatch, SetStateAction, ReactNode, ReactElement, useCallback } from 'react';
import { io, Socket } from "socket.io-client";
import { SocketMessage, SocketMessageType, JoinRoomMessage} from '../../lib/socketTypes';
import cardImages from '../../lib/cardImages';
import tableImage from '../../images/table2.svg';
import Image from 'next/image';

interface State {
    roomExists: boolean | undefined,
    room: string,
    inGame: boolean,
    username: string, 
    team1: string[],
    team2: string[],
    cards: string[],
    trump: string,
    round: [number, string][],
    gameOver: boolean,
    turn: number,
    playerNumber: number,
    points: [number, number],
    socket: Socket | undefined,
}

function convertCookies(val: CookieValueTypes) {
    let converted: string | undefined = (typeof val === 'string') ? val : undefined;
    return converted;
}

function UserCards({cards, activeCard, setActiveCard, validateMove, handlePlay}: 
    {
        cards: string[], activeCard: string, setActiveCard: Dispatch<SetStateAction<string>>, 
        validateMove: (card: string) => boolean, handlePlay: (card: string) => void
    }
): ReactElement 
{
    return (
        <div className="my-2 flex flex-col gap-4 justify-center items-center">
            <div className="flex flex-row gap-1 container relative">
                {
                    cards.map(c => 
                        <button key={c} disabled={!validateMove(c)} onClick={() => setActiveCard(c)} 
                            className={`${activeCard === c ? "border-2 border-solid border-red-500 rounded-lg " : ""} disabled:opacity-50`}>
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

function PlayScreen({state, dispatch}: {state: State, dispatch: React.Dispatch<{type: string, value: any}>})

{
    let [activeCard, setActiveCard] = useState("");

    function validateMove(card: string): boolean {
        return state.playerNumber === state.turn &&
        state.cards.includes(card) &&
        (state.round.length === 0 || card[1] === state.round[0][1][1] || !state.cards.map(c => c[1]).includes(state.round[0][1][1]));
    }

    function handlePlay(card: string) {
        let m: SocketMessage = {
            type: SocketMessageType.Play,
            user_id: convertCookies(getCookie(`sueca:${state.room}:user_id`)),
            card: card,
        }

        state.socket!.emit("message", state.room, m);
        setActiveCard("");
    }

    let all: [string, number][] = [state.team1[0], state.team2[0], state.team1[1], state.team2[1]].map((element, index) => [element, index]);
    let order: [string, number][] = state.playerNumber > 0 ? all.slice(state.playerNumber - 1).concat(all.slice(0, state.playerNumber - 1)) : all; // bottom left top right

    let usernames: string[] = order.map(([u, n]) => u);
    let usernameNumbers: number[] = order.map(([u, n]) => n);

    return (
        <div className="container flex flex-col items-center justify-center relative">
            <div className="my-4 container flex flex-row justify-center header">
                <div className="w-24 container mr-24 trump">
                    {cardImages[state.trump]}
                </div>

                <div className="flex justify-center items-center w-24 h-24 bg-blue-400 blue-points ">
                    <span className="font-bold text-3xl">{state.points[0]}</span>
                </div>

                <div className="flex justify-center items-center w-24 h-24 bg-orange-400 orange-points">
                    <span className="font-bold text-3xl">{state.points[1]}</span>
                </div>

            </div>

            <div className="my-4 inline-block relative">
                <Image
                    src={tableImage}
                    alt="Card table"
                />

                <span className={`absolute top-[90%] left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-3xl
                    ${usernameNumbers[0] % 2 === 0 ? "bg-blue-400" : "bg-orange-400"} ${state.turn === 0 ? "border-4 border-black" : ""}`}
                >
                    {usernames[0]}
                </span>

                <div className="absolute top-[67.5%] left-1/2 -translate-x-1/2 -translate-y-1/2 ">
                    <UserMove round={state.round} playerNumber={usernameNumbers[0]} />
                </div>

                <span className={`absolute top-1/2 -translate-y-1/2 left-[10%] -translate-x-1/2 p-4 rounded-3xl 
                    ${usernameNumbers[1] % 2 === 0 ? "bg-blue-400" : "bg-orange-400"} ${state.turn === 1 ? "border-4 border-black" : ""}`}
                >
                    {usernames[1]}
                </span>

                <div className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={state.round} playerNumber={usernameNumbers[1]} />
                </div>

                <span className={`absolute top-[10%] left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-3xl
                    ${usernameNumbers[2] % 2 === 0 ? "bg-blue-400" : "bg-orange-400"} ${state.turn === 2 ? "border-4 border-black" : ""}`}
                >
                    {usernames[2]}
                </span>

                <div className="absolute top-[32.5%] left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={state.round} playerNumber={usernameNumbers[2]} />
                </div>

                <span className={`absolute top-1/2 -translate-y-1/2 left-[90%] -translate-x-1/2 p-4 rounded-3xl
                    ${usernameNumbers[3] % 2 === 0 ? "bg-blue-400" : "bg-orange-400"} ${state.turn === 3 ? "border-4 border-black" : ""}`}
                >
                    {usernames[3]}
                </span>

                <div className="absolute top-1/2 left-[70%] -translate-x-1/2 -translate-y-1/2">
                    <UserMove round={state.round} playerNumber={usernameNumbers[3]} />
                </div>
            </div>

            {state.cards && <UserCards cards={state.cards} activeCard={activeCard} setActiveCard={setActiveCard} validateMove={validateMove} handlePlay={handlePlay}/>}

        </div>
    );
}

function JoinTeamScreen({state, dispatch}: {state: State, dispatch: React.Dispatch<{type: string, value: any}>})
{
    function joinTeam(team: number) {
        if (!state.username) {
            alert("Precisas de um username para jogar!");
            return;
        }

        if ( (team === 1 && state.team1.includes(state.username)) || (team === 2 && state.team2.includes(state.username)) ) {
            alert("Username duplicado");
            return;
        }

        let m: SocketMessage = {
            type: SocketMessageType.JoinTeam,
            team: team,
            username: state.username,
            user_id: convertCookies(getCookie(`sueca:${state.room}:user_id`)),
        };

        state.socket!.emit("message", state.room, m);
    }


    function leaveTeam(team: number) {
        let user_id = convertCookies(getCookie(`sueca:${state.room}:user_id`));
        if (!user_id) {
            return;
        }

        let m: SocketMessage = {
            type: SocketMessageType.LeaveTeam,
            team: team,
            username: state.username,
            user_id: user_id,
        };

        state.socket!.emit("message", state.room, m);
        deleteCookie(`sueca:${state.room}:user_id`);
    }

    function startGame() {
        let user_id = convertCookies(getCookie(`sueca:${state.room}:user_id`));
        if (!user_id) {
            return;
        }

        let m: SocketMessage = {
            type: SocketMessageType.StartGame,
            username: state.username,
            user_id: user_id,
        };

        state.socket!.emit("message", state.room, m);
    }

    function onUsernameChange(event: React.ChangeEvent<HTMLInputElement>) {
        dispatch({type: "setUsername", value: event.target.value });
    }

    return (
        <div className="container flex flex-col items-center w-screen h-screen">
            <div className="container flex h-10 w-48 mt-8">
                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md dark:bg-gray-600
                    dark:text-gray-400 dark:border-gray-600">
                    @
                </span>
                <input type="text" id="username" maxLength={16} 
                    disabled={state.team1.includes(state.username) || state.team2.includes(state.username)} 
                    value={state.username}
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

                        {state.team1.length > 0 && state.team1.map(u1 => {
                            return <span key={u1} className="bg-gray-200 rounded-full px-3 py-1 text-center text-sm font-semibold text-gray-700 mr-2 mb-2">@{u1}</span>
                        })}

                        {!state.team1.includes(state.username) && state.team1.length < 4 &&
                            <button onClick={ () => joinTeam(1) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Juntar
                            </button>
                        }

                        {state.team1.includes(state.username) && 
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

                        {state.team2.length > 0 && state.team2.map(u2 => {
                            return <span key={u2} className="bg-gray-200 rounded-full px-3 py-1 text-center text-sm font-semibold text-gray-700 mr-2 mb-2">@{u2}</span>
                        })}

                        {!state.team2.includes(state.username) && state.team2.length < 4 &&
                            <button onClick={ () => joinTeam(2) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Juntar
                            </button>
                        }

                        {state.team2.includes(state.username) && 
                            <button onClick={ () => leaveTeam(2) } 
                                className="text-center w-30 h-10 mt-2 mb-4 px-6 py-2 bg-blue-700 text-white hover:bg-blue-800
                                font-semibold rounded-lg border-solid">
                                Sair
                            </button>
                        }

                    </div>
                </div>
            </div>

            {(state.team1.includes(state.username) || state.team2.includes(state.username)) && state.team1.length === 2 && state.team2.length === 2 &&
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

    function reducer(state: State, action: {type: string, value: any}) {
        switch (action.type) {
            case 'setRoom':
                return {
                    ...state,
                    room: action.value,
                }

            case 'setRoomExists':
                return {
                    ...state,
                    roomExists: action.value,
                }

            case 'setInGame':
                return {
                    ...state,
                    inGame: action.value,
                }

            case 'setUsername':
                return {
                    ...state,
                    username: action.value,
                }

            case 'setTeam1':
                return {
                    ...state,
                    team1: action.value,
                }

            case 'setTeam2':
                return {
                    ...state,
                    team2: action.value,
                }

            case 'setCards':
                return {
                    ...state,
                    cards: action.value,
                }

            case 'setTrump':
                return {
                    ...state,
                    trump: action.value,
                }

            case 'setRound':
                return {
                    ...state,
                    round: action.value,
                }
            
            case 'setGameOver':
                return {
                    ...state,
                    gameOver: action.value,
                }

            case 'setTurn':
                return {
                    ...state,
                    turn: action.value,
                }

            case 'setPlayerNumber':
                return {
                    ...state,
                    playerNumber: action.value,
                }

            case 'setPoints':
                return {
                    ...state,
                    points: action.value,
                }

            case 'setSocket':
                return {
                    ...state,
                    socket: action.value,
                }

            default:
                return state;
        } 
    };

    const [state, dispatch] = useReducer(reducer, {
        roomExists: undefined,
        room: "",
        inGame: false,
        username: "", 
        team1: [],
        team2: [],
        cards: [],
        trump: "",
        round: [],
        gameOver: false,
        turn: 0,
        playerNumber: -1,
        points: [],
        socket: undefined,
    });

    let stateRef = useRef<State>(state);
    stateRef.current = state;

    useEffect(() => {
        if (room) {
            console.log(room);
            dispatch({ type: "setRoom", value: room});
        }

        return () => {
            if (state.socket && !state.socket.disconnected) {
                state.socket.disconnect();
            }
        };
    }, [room, state.socket]); // router.query is hydrated after initial page load, so room starts off empty

    useEffect(() => {
        if (state.room !== "") {
            console.log(state.room)
            // initSocketCallback();
            initSocket();
        }

    }, [state.room]);

    useEffect(() => {
        if (state.inGame) {
            let all = [state.team1[0], state.team2[0], state.team1[1], state.team2[1]];

            if (state.username && all.includes(state.username)) {
                dispatch({ type: "setPlayerNumber", value: all.indexOf(state.username) });
            }
        }
    }, [state.inGame]);

    useEffect(() => {
        if (state.round.length === 4 && !state.gameOver) {
            setTimeout(((oldRound: State['round']) => {         // clear cards on table after 3s, if no move was made since (shouldn't happen)
                if (stateRef.current.round === oldRound) {
                    dispatch({ type: "setRound", value: []});
                }
            }).bind(null, state.round), 3000);
        } 
    }, [state.round]);


    // const initSocketCallback = useCallback(initSocket, [state.socket]);
    console.log(stateRef.current);

    async function initSocket() {
        await fetch("/api/socket");
        let socket = io();

        socket.on("message", async (message) => {
            console.log(message);
            console.log(stateRef.current);

            switch (message.type) {
                case SocketMessageType.RoomExists: {
                    let exists = message.exists;

                    dispatch({ type: "setRoomExists", value: exists });

                    break;
                }

                case SocketMessageType.UserId: {
                    let user_id = message.user_id;
                    setCookie(`sueca:${state.room}:user_id`, user_id, {maxAge: 60 * 60 * 24});

                    break;
                }

                case SocketMessageType.Teams: {
                    let t1 = message.team1;
                    let t2 = message.team2;

                    dispatch({type: "setTeam1", value: [...t1]});
                    dispatch({type: "setTeam2", value: [...t2]});

                    break;
                }

                case SocketMessageType.Deal: {
                    let cards = message.cards;
                    let trump = message.trump;

                    dispatch({ type: "setInGame", value: true });
                    dispatch({ type: "setCards", value: cards });
                    dispatch({ type: "setTrump", value: trump });

                    break;
                }

                case SocketMessageType.PlayReply: {
                    let cards = message.cards;
                    dispatch({ type: "setCards", value: cards });

                    break;
                }

                case SocketMessageType.Round: {
                    let round = message.round;
                    let turn = message.turn;
                    let points = message.points;
                    let gameOver = message.gameOver;

                    dispatch({ type: "setGameOver", value: gameOver });
                    dispatch({ type: "setRound", value: round });
                    dispatch({ type: "setTurn", value: turn });
                    dispatch({ type: "setPoints", value: points });

                    if (gameOver) {
                        deleteCookie(`sueca:${state.room}:user_id`);
                        socket.disconnect();
                    }

                    break;
                }

                case SocketMessageType.JoinRoomReply: {
                    let username = message.username;
                    let cards = message.cards;
                    let round = message.round;
                    let turn = message.turn;
                    let trump = message.trump;
                    let points = message.points;

                    let playing: boolean = cards !== undefined;
                    let inGame: boolean = round !== undefined;

                    if (username) {
                        dispatch({ type: "setUsername", value: username });
                    }

                    if (inGame) {
                        dispatch({ type: "setInGame", value: true });
                        dispatch({ type: "setRound", value: round });
                        dispatch({ type: "setTurn", value: turn });
                        dispatch({ type: "setTrump", value: trump });
                        dispatch({ type: "setPoints", value: points });
                    }

                    if (playing) {
                        dispatch({ type: "setCards", value: cards });
                    }
                }
            }

        });

        let m: JoinRoomMessage = {
            type: SocketMessageType.JoinRoom,
            user_id: convertCookies(getCookie(`sueca:${state.room}:user_id`)),
        };

        // console.log(room, m);
        socket.emit("message", room, m);

        dispatch({ type: "setSocket", value: socket });
    }

    if (state.roomExists === false) {
        return (
            <p>Sala nao existente</p>
        )
    }

    if (state.socket && state.room && state.roomExists) {
        if (!state.inGame) {
            return <JoinTeamScreen 
                state={state}
                dispatch={dispatch}
            />;
        }

        else {
            return <PlayScreen 
                state={state}
                dispatch={dispatch}
            />;
        }
    }
}
