"use strict";

exports.__esModule = true;
exports.check = check;

var _headers = _interopRequireDefault(require("./headers"));

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// NOTE: https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS
function check(ctx) {
  const reqOrigin = ctx.dest.reqOrigin; // PASSED: Same origin.

  if (ctx.dest.domain === reqOrigin) return true; // PASSED: We have a "preflight" request.

  if (ctx.req.method === 'OPTIONS') return true;
  const withCredentials = !!ctx.req.headers[_headers.default.withCredentials] || ctx.req.headers[_headers.default.fetchRequestCredentials] === 'include';
  const allowOriginHeader = ctx.destRes.headers['access-control-allow-origin'];
  const allowCredentialsHeader = ctx.destRes.headers['access-control-allow-credentials'];
  const allowCredentials = String(allowCredentialsHeader).toLowerCase() === 'true';
  const allowedOrigins = (0, _lodash.castArray)(allowOriginHeader);
  const wildcardAllowed = allowedOrigins.includes('*'); // FAILED: Destination server doesn't provide the Access-Control-Allow-Origin header.
  // So cross-domain requests are denied

  if (!allowOriginHeader) return false; // FAILED: Credentialed requests are not allowed or wild carding was used
  // for the allowed origin (credentialed requests should specify the exact domain).

  if (withCredentials && (!allowCredentials || wildcardAllowed)) return false; // FINAL CHECK: The request origin should match one of the allowed origins.

  return wildcardAllowed || allowedOrigins.includes(reqOrigin);
}