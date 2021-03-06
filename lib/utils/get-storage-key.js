"use strict";

exports.__esModule = true;
exports.default = getStorageKey;
// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------

/* eslint hammerhead/proto-methods: 2 */
const STORAGE_WRAPPER_PREFIX = 'hammerhead|storage-wrapper|';

function getStorageKey(sessionId, host) {
  return STORAGE_WRAPPER_PREFIX + sessionId + '|' + host;
}

module.exports = exports.default;