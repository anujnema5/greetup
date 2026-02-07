export interface EventPayloads {
    'user:connected': {
        userId: string;
        socketId: string;
        timestamp: Date;
        userAgent?: string;
    };
    'user:disconnected': {
        userId: string;
        socketId: string;
        timestamp: Date;
    };
    'user:authenticated': {
        userId: string;
        socketId: string;
        userData: any;
    };
    'redis:update_online_users': {
        action: 'add' | 'remove';
        userId: string;
        socketId: string;
    };
}