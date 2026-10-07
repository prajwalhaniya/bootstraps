import { randomUUID } from "node:crypto";

export interface Item {
    id: string;
    name: string;
}

const items = new Map<string, Item>();

export const itemService = {
    list: (): Item[] => Array.from(items.values()),
    get: (id: string): Item | undefined => items.get(id),
    create: (name: string): Item => {
        const item: Item = { id: randomUUID(), name };
        items.set(item.id, item);
        return item;
    },
    remove: (id: string): boolean => items.delete(id),
};
