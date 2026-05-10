import path from "node:path";
import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";
const envPath = path.resolve(process.cwd(), "env", `.env.${nodeEnv}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  dotenv.config();
}
