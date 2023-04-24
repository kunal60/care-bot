import { Request, RequestHandler } from 'express';
export declare const bodyParser: () => RequestHandler;
export declare const getRawBody: (reqOriginal: Request) => string;
