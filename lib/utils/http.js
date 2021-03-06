"use strict";

exports.__esModule = true;
exports.addPreventCachingHeaders = addPreventCachingHeaders;
exports.respond204 = respond204;
exports.respond404 = respond404;
exports.respond500 = respond500;
exports.respondWithJSON = respondWithJSON;
exports.respondStatic = respondStatic;
exports.fetchBody = fetchBody;
exports.PREVENT_CACHING_HEADERS = void 0;

var _lodash = require("lodash");

var _promisifyStream = _interopRequireDefault(require("../utils/promisify-stream"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const STATIC_RESOURCES_DEFAULT_CACHING_OPTIONS = {
  maxAge: 30,
  mustRevalidate: true
};
const PREVENT_CACHING_HEADERS = {
  'cache-control': 'no-cache, no-store, must-revalidate',
  'pragma': 'no-cache'
};
exports.PREVENT_CACHING_HEADERS = PREVENT_CACHING_HEADERS;

function addPreventCachingHeaders(res) {
  res.setHeader('cache-control', PREVENT_CACHING_HEADERS['cache-control']);
  res.setHeader('pragma', PREVENT_CACHING_HEADERS['pragma']);
}

function respond204(res) {
  res.statusCode = 204;
  res.end();
}

function respond404(res) {
  res.statusCode = 404;
  res.end();
}

function respond500(res, err = '') {
  res.statusCode = 500;
  res.end(err);
}

function respondWithJSON(res, data, skipContentType) {
  if (!skipContentType) res.setHeader('content-type', 'application/json'); // NOTE: GH-105

  addPreventCachingHeaders(res);
  res.end(data ? JSON.stringify(data) : '');
}

function respondStatic(req, res, resource, cachingOptions = {}) {
  cachingOptions = (0, _lodash.defaultsDeep)(cachingOptions, STATIC_RESOURCES_DEFAULT_CACHING_OPTIONS);

  if (resource.etag === req.headers['if-none-match']) {
    res.statusCode = 304;
    res.end();
  } else {
    const {
      maxAge,
      mustRevalidate
    } = cachingOptions;
    res.setHeader('cache-control', `max-age=${maxAge}${mustRevalidate ? ', must-revalidate' : ''}`);
    res.setHeader('etag', resource.etag);
    res.setHeader('content-type', resource.contentType);
    res.end(resource.content);
  }
}

function fetchBody(r) {
  return (0, _promisifyStream.default)(r);
}