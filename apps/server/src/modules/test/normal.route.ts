import { AppError, NotFoundError } from "@/shared/errors";
import { Hono } from "hono";

const normalRouter = new Hono();

normalRouter.get("/", (c) => {
    return c.json({ message: "This is not a protected route." })
})

export default normalRouter;