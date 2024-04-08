import { Server as IOServer} from 'socket.io';
import type { Server as HTTPServer } from "http";
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as NetSocket } from "net";

export interface SocketServer extends HTTPServer {
    io?: IOServer | undefined;
}

export interface SocketWithIO extends NetSocket {
    server: SocketServer;
}

export interface NextApiResponseWithSocket extends NextApiResponse {
    socket: SocketWithIO;
}

export enum SocketMessageType {
    UsernameTaken,
    UserId,
    RoomExists,
    JoinRoom,
    JoinRoomReply,
    JoinTeam,
    LeaveTeam,
    Teams,
    StartGame,
    Deal,
    Play,
    PlayReply,
    Round,
}

// export interface SocketMessage {
//     type: SocketMessageType;
//     body: undefined | Object | JoinRoomMessage;
// }

export type SocketMessage =
    | UsernameTakenMessage
    | UserIdMessage
    | RoomExistsMessage
    | JoinRoomMessage
    | JoinRoomReplyMessage
    | JoinTeamMessage
    | LeaveTeamMessage
    | TeamsMessage
    | StartGameMessage
    | DealMessage
    | PlayMessage
    | PlayReplyMessage
    | RoundMessage;

export interface UsernameTakenMessage {
    type: SocketMessageType.UsernameTaken;
}

export interface UserIdMessage {
    type: SocketMessageType.UserId;
    user_id: string;
}

export interface RoomExistsMessage {
    type: SocketMessageType.RoomExists;
    exists: boolean;
}

export interface JoinRoomMessage {
    type: SocketMessageType.JoinRoom;
    user_id?: string;
}

export interface JoinRoomReplyMessage {
    type: SocketMessageType.JoinRoomReply;
    username?: string;
    cards?: string[];
    round?: [number, string][];
    turn?: number;
    trump?: string;
    points?: number[];
}

export interface JoinTeamMessage {
    type: SocketMessageType.JoinTeam;
    username: string;
    team: number;
    user_id?: string;
}

export interface LeaveTeamMessage {
    type: SocketMessageType.LeaveTeam;
    username: string;
    team: number;
    user_id: string;
}

export interface TeamsMessage {
    type: SocketMessageType.Teams;
    team1: string[];
    team2: string[];
}

export interface StartGameMessage {
    type: SocketMessageType.StartGame;
    username: string;
    user_id: string;
}

export interface DealMessage {
    type: SocketMessageType.Deal;
    cards: string[];
    trump: string;
}

export interface PlayMessage {
    type: SocketMessageType.Play;
    user_id?: string;
    card: string;
}

export interface PlayReplyMessage {
    type: SocketMessageType.PlayReply;
    cards: string[];
}

export interface RoundMessage {
    type: SocketMessageType.Round;
    round: [number, string][];
    turn: number;
    points: number[];
    game_over: boolean;
}
