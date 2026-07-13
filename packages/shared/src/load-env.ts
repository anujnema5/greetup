import path from "node:path";
import { config } from "dotenv";

const nodeEnv = process.env.NODE_ENV || "development";
const cwd = process.cwd();
const primary = path.join(cwd, "env", `.env.${nodeEnv}`);

const first = config({ path: primary });
if (first.error) {
  config({ path: path.join(cwd, ".env") });
}
