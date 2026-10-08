import { Router } from "express";
import { schedulerState, startInvoiceReminderScheduler } from "../scheduler.js";

startInvoiceReminderScheduler();

const router = Router();

router.get("/status", (_req, res) => {
    res.json(schedulerState);
});

export default router;
