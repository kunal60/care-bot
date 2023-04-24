import bodyParserOriginal from 'body-parser';
import { Request, RequestHandler } from 'express';
import { ServerResponse } from 'http';
import _ from 'lodash';
import qs from 'qs';
import JSONbig from 'true-json-bigint';
import typeis from 'type-is';

/**
 * An express middleware that parses the body of a request.
 *
 * Usage:
 *
 *   const app = express()
 *   app.use(bodyParser())
 *
 * Writing our own body parser, because:
 *
 * - body-parser does not have an easy mechanism for getting the raw body
 *   of a request
 *
 * - body-parser's JSON parser does not support big integers
 */
export const bodyParser = (): RequestHandler => {
  return (req, _res, next) => {
    // match body-parser implementation
    req.body = req.body ?? {};

    bodyParserPromise(req).then(next).catch(next);
  };
};

const RAW_BODY = Symbol('RAW_BODY');

interface RequestWithRawBody extends Request {
  [RAW_BODY]: string;
}

/**
 * Store parsed request body in `req.body` (to emulate original body-parser
 * implementation) and raw request body in `req[RAW_BODY]`.
 */
const bodyParserPromise = async (reqOriginal: Request): Promise<void> => {
  const req = reqOriginal as RequestWithRawBody;

  // match body-parser implementation
  req.body = req.body ?? {};

  if (!typeis.hasBody(req)) {
    return;
  }

  const parseBody = getBodyParser(req);
  if (!parseBody) {
    return;
  }

  const rawBody = await readRawBody(req);
  req[RAW_BODY] = rawBody;

  try {
    req.body = parseBody(rawBody);
  } catch (_) {
    // eslint-disable-line no-empty
  }
};

const readRawBody = (req: Request): Promise<string> => {
  const oldBody = req.body;

  return new Promise((resolve, reject) => {
    const next = (err: unknown) => {
      if (err) {
        reject(err);
      }

      const newBody = req.body;
      req.body = oldBody;
      resolve(newBody);
    };

    // bodyParser shouldn't actually use res; use `null` to get an error if
    // bodyParser tries to use res at all.
    const res = null as unknown as ServerResponse;

    bodyParserOriginal.text({ type: '*/*', limit: '100MB' })(req, res, next);
  });
};

/**
 * Get the raw body of the request.
 */
export const getRawBody = (reqOriginal: Request): string => {
  const req = reqOriginal as RequestWithRawBody;
  return req[RAW_BODY] ?? '';
};

/** Body parsers **/

type BodyParser<T = unknown> = (rawBody: string) => T;

const parseJson = (rawBody: string) => JSONbig.parse(rawBody);

const parseUrlEncoded = (rawBody: string) =>
  qs.parse(rawBody, {
    allowPrototypes: true,
    depth: Infinity,
  });

const CONTENT_TYPE_PARSERS: Record<string, BodyParser> = {
  'application/json': parseJson,
  'application/x-www-form-urlencoded': parseUrlEncoded,
};

const getBodyParser = (req: Request): BodyParser | null => {
  const contentType = typeis(req, _.keys(CONTENT_TYPE_PARSERS));
  if (!contentType) {
    return null;
  }

  return CONTENT_TYPE_PARSERS[contentType];
};
