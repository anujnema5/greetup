import 'dotenv/config';
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