import { REDIS_URL } from "@/shared/constants"
import { Hono } from "hono"
import { cors } from "hono/cors"
import router from "./modules/router"
import { auth } from "@/core/auth/auth"
import { setupRedis } from "@/core/redis"
import { errorHandler } from "@/middleware"

const createApp = async () => {
    await setupRedis(REDIS_URL);

    const app = new Hono()

    // Middlewares
    app.use(
        cors({
            origin: ['http://localhost:3000', 'http://localhost:5050'],
            allowHeaders: ['Content-Type', 'Authorization'],
            allowMethods: ['POST', 'GET', 'OPTIONS'],
            exposeHeaders: ['Content-Length'],
            maxAge: 600,
            credentials: true,
        })
    )

    // Auth
    app.all('/api/auth/**', (c) => auth.handler(c.req.raw))

    // Routes
    app.route('/api', router)

    // Health check
    app.get('/', (c) => c.json({ message: 'Circlo Hono!' }))

    // Error handler
    app.onError(errorHandler)

    return app
}

export default createApp;