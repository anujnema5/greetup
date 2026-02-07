import dotenv from 'dotenv';
dotenv.config();

export const WEB_CLIENT_HOST = process.env.WEB_CLIENT_HOST;
export const REDIS_URL = process.env.REDIS_URL!;
export const SERVER_URL = process.env.SERVER_URL!
export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL!
export const DEV_NOTIFICATION_EMAIL = process.env.DEV_NOTIFICATION_EMAIL!