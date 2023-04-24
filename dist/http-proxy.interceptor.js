"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpProxy = exports.EmptyErrorFilter = void 0;
const common_1 = require("@nestjs/common");
const express_http_proxy_1 = __importDefault(require("express-http-proxy"));
const rxjs_1 = require("rxjs");
const bodyParser_1 = require("./bodyParser");
let EmptyErrorFilter = class EmptyErrorFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        console.error({ exception });
        response.end();
    }
};
EmptyErrorFilter = __decorate([
    (0, common_1.Catch)(rxjs_1.EmptyError)
], EmptyErrorFilter);
exports.EmptyErrorFilter = EmptyErrorFilter;
const HttpProxy = (host, options) => (0, common_1.UseInterceptors)(mkHttpProxyInterceptor(host, options));
exports.HttpProxy = HttpProxy;
const mkHttpProxyInterceptor = (host, options) => {
    class HttpProxyInterceptor {
        intercept(ctx, next) {
            const http = ctx.switchToHttp();
            const req = http.getRequest();
            const res = http.getResponse();
            const body = (0, bodyParser_1.getRawBody)(req);
            return next.handle().pipe((0, rxjs_1.switchMap)((proxyOptions) => {
                var _a;
                const proxyHost = (_a = proxyOptions.url) !== null && _a !== void 0 ? _a : host;
                if (!proxyHost) {
                    throw new Error('No host to proxy');
                }
                return new rxjs_1.Observable((subscriber) => {
                    const handleErrors = (e) => {
                        console.error({ e });
                        subscriber.error(`HttpProxy error: ${e}`);
                    };
                    res.on('finish', () => subscriber.complete());
                    (0, express_http_proxy_1.default)(proxyHost, Object.assign(Object.assign(Object.assign({}, options), proxyOptions), { proxyErrorHandler: handleProxyErrors, proxyReqBodyDecorator: () => body }))(req, res, handleErrors);
                });
            }), (0, rxjs_1.catchError)((e) => {
                console.error({ e });
                return (0, rxjs_1.of)('');
            }));
        }
    }
    return (0, common_1.mixin)(HttpProxyInterceptor);
};
const isNetworkError = (error) => typeof (error === null || error === void 0 ? void 0 : error.code) === 'string';
const isHostUnreachableError = (error) => typeof error === 'object' &&
    error !== null &&
    isNetworkError(error) &&
    (error.code.includes('ECONNREFUSED') || error.code.includes('ENOTFOUND'));
const handleProxyErrors = (e, res, next) => {
    if (isHostUnreachableError(e)) {
        return res.status(500).send({
            error: 'Internal server error',
            message: `Backend service is down (${e.code})`,
            statusCode: 500,
        });
    }
    next(e);
};
//# sourceMappingURL=http-proxy.interceptor.js.map