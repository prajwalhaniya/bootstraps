import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
