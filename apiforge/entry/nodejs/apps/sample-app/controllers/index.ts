import type { Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../../../common/middleware/errorHandler.js";
import { itemService } from "../services/index.js";

const createItemSchema = z.object({
    name: z.string().min(1),
});

export function listItems(_req: Request, res: Response) {
    res.json(itemService.list());
}

export function getItem(req: Request<{ id: string }>, res: Response) {
    const item = itemService.get(req.params.id);
    if (!item) throw new HttpError(404, `Item ${req.params.id} not found`);
    res.json(item);
}

export function createItem(req: Request, res: Response) {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.message);

    res.status(201).json(itemService.create(parsed.data.name));
}

export function deleteItem(req: Request<{ id: string }>, res: Response) {
    if (!itemService.remove(req.params.id)) throw new HttpError(404, `Item ${req.params.id} not found`);
    res.status(204).send();
}
