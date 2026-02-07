import type { Context } from "hono";
// import { fetchProfileStepsService } from "../services/profile-setup.service";
import { ApiResponse } from "@/shared/responses";

export const handleFetchProfileSteps = async (c: Context) => {
    try {
        const userId = c.get("userId");
        // const result = await fetchProfileStepsService(userId);
        // return c.json(ApiResponse.success(result, "Steps Retrieved Sucessfully"), 200)
    } catch (error: any) {
        console.error("Fetch steps error:", error);
        return c.json({ error: "Failed to fetch steps" }, 500);
    }
};