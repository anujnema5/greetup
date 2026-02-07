import winston from "winston";
const { combine, timestamp, printf, colorize, json } = winston.format;

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        json(),
        printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: '../logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: '../logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize({ all: true }),
            json(),
            timestamp(),
            printf(({ level, message, timestamp }) => {
                return `${timestamp} [${level}]: ${message}`;
            })
        )
    }));
}

export default logger;
