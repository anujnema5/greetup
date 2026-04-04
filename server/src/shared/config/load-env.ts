import { config } from "dotenv";
import { join } from "path";

const nodeEnv = process.env.NODE_ENV || "development";
const cwd = process.cwd();
const primary = join(cwd, "env", `.env.${nodeEnv}`);

const first = config({ path: primary });
if (first.error) {
  config({ path: join(cwd, ".env") });
}
