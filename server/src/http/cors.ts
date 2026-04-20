/** Browser clients allowed to call this API (cookies + credentials). */
export const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5300"],
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true,
};
