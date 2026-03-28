import path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "env", `.env.${process.env.NODE_ENV ?? "development"}`) });
import { defineConfig } from 'drizzle-kit';

const databaseConfig = defineConfig({
    out: './src/core/database/migration',
    dialect: 'postgresql',
    schema: './src/core/database/schema',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    casing: 'snake_case'
})

export default databaseConfig;