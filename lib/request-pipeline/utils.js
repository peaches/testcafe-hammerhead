"use strict";

exports.__esModule = true;
exports.sendRequest = sendRequest;
exports.error = error;
exports.callResponseEventCallbackForProcessedRequest = callResponseEventCallbackForProcessedRequest;
exports.callOnRequestEventCallback = callOnRequestEventCallback;
exports.callOnResponseEventCallbackForFailedSameOriginCheck = callOnResponseEventCallbackForFailedSameOriginCheck;
exports.callOnConfigureResponseEventForNonProcessedRequest = callOnConfigureResponseEventForNonProcessedRequest;
exports.callOnResponseEventCallbackWithBodyForNonProcessedRequest = callOnResponseEventCallbackWithBodyForNonProcessedRequest;
exports.callOnResponseEventCallbackWithoutBodyForNonProcessedResource = callOnResponseEventCallbackWithoutBodyForNonProcessedResource;
exports.callOnResponseEventCallbackForMotModifiedResource = callOnResponseEventCallbackForMotModifiedResource;

var _info = require("../session/events/info");

var _fileRequest = _interopRequireDefault(require("./file-request"));

var _destinationRequest = _interopRequireDefault(require("./destination-request"));

var _promisifyStream = _interopRequireDefault(require("../utils/promisify-stream"));

var _configureResponseEvent = _interopRequireDefault(require("../session/events/configure-response-event"));

var _requestEvent = _interopRequireDefault(require("../session/events/request-event"));

var _responseEvent = _interopRequireDefault(require("../session/events/response-event"));

var _names = _interopRequireDefault(require("../session/events/names"));

var _configureResponseEventOptions = _interopRequireDefault(require("../session/events/configure-response-event-options"));

var _buffer = require("../utils/buffer");

var _stream = require("stream");

var _messages = require("../messages");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function sendRequest(ctx) {
  return new Promise(resolve => {
    const req = ctx.isFileProtocol ? new _fileRequest.default(ctx.reqOpts.url) : new _destinationRequest.default(ctx.reqOpts);
    ctx.goToNextStage = false;
    req.on('response', res => {
      if (ctx.isWebSocketConnectionReset) {
        res.destroy();
        resolve();
        return;
      }

      ctx.destRes = res;
      ctx.goToNextStage = true;
      res.once('end', () => {
        ctx.isDestResReadableEnded = true;
      });
      resolve();
    });
    req.on('error', err => {
      // NOTE: Sometimes the underlying socket emits an error event. But if we have a response body,
      // we can still process such requests. (B234324)
      if (ctx.isDestResBodyMalformed()) {
        error(ctx, (0, _messages.getText)(_messages.MESSAGE.destConnectionTerminated, ctx.dest.url, err.toString()));
        ctx.goToNextStage = false;
      }

      resolve();
    });
    req.on('fatalError', err => {
      error(ctx, err);
      resolve();
    });
    req.on('socketHangUp', () => {
      ctx.req.socket.end();
      resolve();
    });
    if (req instanceof _fileRequest.default) req.init();
  });
}

function error(ctx, err) {
  if (ctx.isPage && !ctx.isIframe) ctx.session.handlePageError(ctx, err);else if (ctx.isFetch || ctx.isXhr) ctx.req.destroy();else ctx.closeWithError(500, err.toString());
}

async function callResponseEventCallbackForProcessedRequest(ctx, configureResponseEvent) {
  const responseInfo = new _info.ResponseInfo(ctx);
  const preparedResponseInfo = new _info.PreparedResponseInfo(responseInfo, configureResponseEvent.opts);
  const responseEvent = new _responseEvent.default(configureResponseEvent._requestFilterRule, preparedResponseInfo);
  await ctx.session.callRequestEventCallback(_names.default.onResponse, configureResponseEvent._requestFilterRule, responseEvent);
}

async function callOnRequestEventCallback(ctx, rule, reqInfo) {
  const requestEvent = new _requestEvent.default(ctx, rule, reqInfo);
  await ctx.session.callRequestEventCallback(_names.default.onRequest, rule, requestEvent);
}

async function callOnResponseEventCallbackForFailedSameOriginCheck(ctx, rule, configureOpts) {
  const responseInfo = new _info.ResponseInfo(ctx);
  const preparedResponseInfo = new _info.PreparedResponseInfo(responseInfo, configureOpts);
  const responseEvent = new _responseEvent.default(rule, preparedResponseInfo);
  await ctx.session.callRequestEventCallback(_names.default.onResponse, rule, responseEvent);
}

async function callOnConfigureResponseEventForNonProcessedRequest(ctx) {
  await ctx.forEachRequestFilterRule(async rule => {
    const configureResponseEvent = new _configureResponseEvent.default(ctx, rule, _configureResponseEventOptions.default.DEFAULT);
    await ctx.session.callRequestEventCallback(_names.default.onConfigureResponse, rule, configureResponseEvent);
    ctx.onResponseEventData.push({
      rule,
      opts: configureResponseEvent.opts
    });
  });
}

async function callOnResponseEventCallbackWithBodyForNonProcessedRequest(ctx, onResponseEventDataWithBody) {
  const destResBodyCollectorStream = new _stream.PassThrough();
  ctx.destRes.pipe(destResBodyCollectorStream);
  (0, _promisifyStream.default)(destResBodyCollectorStream).then(async data => {
    ctx.saveNonProcessedDestResBody(data);
    const responseInfo = new _info.ResponseInfo(ctx);
    await Promise.all(onResponseEventDataWithBody.map(async ({
      rule,
      opts
    }) => {
      const preparedResponseInfo = new _info.PreparedResponseInfo(responseInfo, opts);
      const responseEvent = new _responseEvent.default(rule, preparedResponseInfo);
      await ctx.session.callRequestEventCallback(_names.default.onResponse, rule, responseEvent);
    }));
    (0, _buffer.toReadableStream)(data).pipe(ctx.res);
  });
}

async function callOnResponseEventCallbackWithoutBodyForNonProcessedResource(ctx, onResponseEventDataWithoutBody) {
  const responseInfo = new _info.ResponseInfo(ctx);
  await Promise.all(onResponseEventDataWithoutBody.map(async item => {
    const preparedResponseInfo = new _info.PreparedResponseInfo(responseInfo, item.opts);
    const responseEvent = new _responseEvent.default(item.rule, preparedResponseInfo);
    await ctx.session.callRequestEventCallback(_names.default.onResponse, item.rule, responseEvent);
  }));
  ctx.destRes.pipe(ctx.res);
}

async function callOnResponseEventCallbackForMotModifiedResource(ctx) {
  const responseInfo = new _info.ResponseInfo(ctx);
  await Promise.all(ctx.onResponseEventData.map(async item => {
    const preparedResponseInfo = new _info.PreparedResponseInfo(responseInfo, item.opts);
    const responseEvent = new _responseEvent.default(item.rule, preparedResponseInfo);
    await ctx.session.callRequestEventCallback(_names.default.onResponse, item.rule, responseEvent);
  }));
  ctx.res.end();
}