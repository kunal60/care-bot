import { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import proxy from 'express-http-proxy';
type ProxyArgs = Parameters<typeof proxy>;
type ProxyHost = ProxyArgs[0];
export interface ProxyOptions extends proxy.ProxyOptions {
    url?: string;
    enableTracing?: boolean;
}
export declare class EmptyErrorFilter implements ExceptionFilter {
    catch(exception: Error, host: ArgumentsHost): void;
}
export declare const HttpProxy: (host?: ProxyHost, options?: proxy.ProxyOptions) => MethodDecorator & ClassDecorator;
export {};
