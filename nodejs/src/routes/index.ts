import express from "express";
import userController from "../controller/index.js";
import { asyncHandler } from "../services/helpers/asyncHandler.js";
import { strictRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router({ mergeParams: true });

router.get("/", (_req, res) => {
    res.json({ message: "OK" });
});

router.get(
    "/users",
    strictRateLimiter,
    asyncHandler(async (_req, res) => {
        const user = await userController.getUsers();
        res.json(user);
    })
);

export default router;
