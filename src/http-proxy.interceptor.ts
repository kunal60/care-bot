import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  mixin,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { NextFunction, Response } from 'express';
import proxy from 'express-http-proxy';
import { catchError, EmptyError, Observable, of, switchMap } from 'rxjs';
import { getRawBody } from './bodyParser';

type ProxyArgs = Parameters<typeof proxy>;
type ProxyHost = ProxyArgs[0];

export interface ProxyOptions extends proxy.ProxyOptions {
  url?: string;
  enableTracing?: boolean;
}

@Catch(EmptyError)
export class EmptyErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    console.error({ exception });

    response.end();
  }
}

/**
 * A decorator to proxy a route using express-http-proxy.
 *
 * Route will still run through guards/interceptors, etc.
 *
 * Usage:
 *
 * @Get('/foo')
 * @HttpProxy('http://google.com', options)
 * proxyFoo() {
 *   return {
 *     // if url is specified, overrides url specified in decorator
 *     // URL may be omitted in decorator, in which case, URL must be
 *     // specified here.
 *     url: 'http://google.com',
 *
 *     // any options set here will override options set in decorator
 *     ...options,
 *   }
 * }
 */
export const HttpProxy = (host?: ProxyHost, options?: proxy.ProxyOptions) =>
  UseInterceptors(mkHttpProxyInterceptor(host, options));

const mkHttpProxyInterceptor = (
  host?: ProxyHost,
  options?: proxy.ProxyOptions,
) => {
  class HttpProxyInterceptor implements NestInterceptor {
    // Note: Currently hardcoded for Express
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
      const http = ctx.switchToHttp();
      const req = http.getRequest();

      const res = http.getResponse();

      const body = getRawBody(req);

      return next.handle().pipe(
        switchMap((proxyOptions: ProxyOptions) => {
          const proxyHost = proxyOptions.url ?? host;
          if (!proxyHost) {
            throw new Error('No host to proxy');
          }

          return new Observable((subscriber) => {
            const handleErrors = (e: unknown) => {
              console.error({ e });
              subscriber.error(`HttpProxy error: ${e}`);
            };

            res.on('finish', () => subscriber.complete());

            proxy(proxyHost, {
              ...options,
              ...proxyOptions,
              proxyErrorHandler: handleProxyErrors,
              proxyReqBodyDecorator: () => body,
            })(req, res, handleErrors);
          });
        }),
        catchError((e) => {
          console.error({ e });
          return of('');
        }),
      );
    }
  }

  return mixin(HttpProxyInterceptor);
};

interface NetworkError {
  code: string;
}

const isNetworkError = (error?: {
  code?: string | undefined;
}): error is NetworkError => typeof error?.code === 'string';

const isHostUnreachableError = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  isNetworkError(error) &&
  (error.code.includes('ECONNREFUSED') || error.code.includes('ENOTFOUND'));

const handleProxyErrors = (
  e: NetworkError,
  res: Response,
  next: NextFunction,
) => {
  if (isHostUnreachableError(e)) {
    return res.status(500).send({
      error: 'Internal server error',
      message: `Backend service is down (${e.code})`,
      statusCode: 500,
    });
  }

  next(e);
};
