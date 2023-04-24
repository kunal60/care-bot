"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRawBody = exports.bodyParser = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const lodash_1 = __importDefault(require("lodash"));
const qs_1 = __importDefault(require("qs"));
const true_json_bigint_1 = __importDefault(require("true-json-bigint"));
const type_is_1 = __importDefault(require("type-is"));
const bodyParser = () => {
    return (req, _res, next) => {
        var _a;
        req.body = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        bodyParserPromise(req).then(next).catch(next);
    };
};
exports.bodyParser = bodyParser;
const RAW_BODY = Symbol('RAW_BODY');
const bodyParserPromise = async (reqOriginal) => {
    var _a;
    const req = reqOriginal;
    req.body = (_a = req.body) !== null && _a !== void 0 ? _a : {};
    if (!type_is_1.default.hasBody(req)) {
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
    }
    catch (_) {
    }
};
const readRawBody = (req) => {
    const oldBody = req.body;
    return new Promise((resolve, reject) => {
        const next = (err) => {
            if (err) {
                reject(err);
            }
            const newBody = req.body;
            req.body = oldBody;
            resolve(newBody);
        };
        const res = null;
        body_parser_1.default.text({ type: '*/*', limit: '100MB' })(req, res, next);
    });
};
const getRawBody = (reqOriginal) => {
    var _a;
    const req = reqOriginal;
    return (_a = req[RAW_BODY]) !== null && _a !== void 0 ? _a : '';
};
exports.getRawBody = getRawBody;
const parseJson = (rawBody) => true_json_bigint_1.default.parse(rawBody);
const parseUrlEncoded = (rawBody) => qs_1.default.parse(rawBody, {
    allowPrototypes: true,
    depth: Infinity,
});
const CONTENT_TYPE_PARSERS = {
    'application/json': parseJson,
    'application/x-www-form-urlencoded': parseUrlEncoded,
};
const getBodyParser = (req) => {
    const contentType = (0, type_is_1.default)(req, lodash_1.default.keys(CONTENT_TYPE_PARSERS));
    if (!contentType) {
        return null;
    }
    return CONTENT_TYPE_PARSERS[contentType];
};
//# sourceMappingURL=bodyParser.js.map