// eslint-disable-next-line max-classes-per-file
import { Controller, Get, HttpServer, UseFilters } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import nock from 'nock';
import request from 'supertest';

import {
  EmptyErrorFilter,
  HttpProxy,
  ProxyOptions,
} from './http-proxy.interceptor';

const backendUrl = 'http://test.example.org';

@Controller()
class TestController {
  @Get('/test')
  @UseFilters(new EmptyErrorFilter())
  @HttpProxy()
  getTest(): ProxyOptions {
    return {
      url: backendUrl,
    };
  }
}

let app: NestExpressApplication;
let httpServer: HttpServer;

let scope: nock.Scope;

beforeEach(async () => {
  scope = nock(backendUrl).get('/test').reply(200, '1');

  jest.resetAllMocks();

  const moduleRef = Test.createTestingModule({
    controllers: [TestController],
  });

  const testModule = await moduleRef.compile();
  app = testModule.createNestApplication<NestExpressApplication>(undefined, {
    bodyParser: false,
  });

  await app.init();

  httpServer = app.getHttpServer();
});

afterEach(async () => {
  await app.close();

  nock.cleanAll();
  nock.restore();
});

it('proxies requests', async () => {
  await request(httpServer).get('/test');

  scope.done();
});
