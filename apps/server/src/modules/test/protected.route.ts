import { auth } from "@/core/auth/auth";
import { Hono } from "hono";

const protectedRoute = new Hono();

protectedRoute.get("/", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    
    if(!session) {
        return c.json({message: "Unauthorized"}, 401)
    }
    
    return c.json({ message: "This is a protected route." })
})

export default protectedRoute;