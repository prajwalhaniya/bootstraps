import { Router } from "express";
import { listItems, getItem, createItem, deleteItem } from "../controllers/index.js";

const router = Router();

router.get("/items", listItems);
router.get("/items/:id", getItem);
router.post("/items", createItem);
router.delete("/items/:id", deleteItem);

export default router;
