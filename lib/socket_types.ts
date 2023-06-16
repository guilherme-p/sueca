export enum SocketMessageType {
    UsernameTaken,
    UserId,
    RoomExists,
    JoinRoom,
    JoinTeam,
    LeaveTeam,
    Teams,
    StartGame,
    Deal,
    Play,
    Round,
}  

export interface SocketMessage {
    type: SocketMessageType;
    body?: Object;
}
