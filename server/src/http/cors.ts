import config from "@/shared/config/config";

const devOrigins = ["http://localhost:3000", "http://localhost:5300"];

/** Browser clients allowed to call this API (cookies + credentials). */
export const corsOptions = {
  origin: config.webClientHost
    ? [config.webClientHost, ...devOrigins]
    : devOrigins,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
};
