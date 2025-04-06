import express from "express";
import userController from "../controller/index.js";

const router = express.Router({ mergeParams: true });

router.get("/", (req, res) => {
    res.send("This is a simple route");
});

router.get("/users", async (req, res) => {
    const getUser = await userController.getUsers();
    res.send(getUser);
});

export default router;