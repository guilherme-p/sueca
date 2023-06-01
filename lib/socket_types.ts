export enum SocketMessageType {
    UsernameTaken,
    UserId,
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
    body?: Object | undefined;
}
