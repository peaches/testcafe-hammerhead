"use strict";

exports.__esModule = true;
exports.default = void 0;

var bufferUtils = _interopRequireWildcard(require("../utils/buffer"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const INPUT_NAME_RE = /;\s*name="([^"]*)"/i;
const FILE_NAME_RE = /;\s*filename="([^"]*)"/i;
const HEADER_RE = /^(.+?):\s*(.*)$/;

class FormDataEntry {
  constructor() {
    _defineProperty(this, "_headers", {});

    _defineProperty(this, "body", []);

    _defineProperty(this, "name", '');

    _defineProperty(this, "fileName", '');
  }

  _parseContentDisposition(contentDisposition) {
    const inputNameMatch = contentDisposition.match(INPUT_NAME_RE);
    const fileNameMatch = contentDisposition.match(FILE_NAME_RE);
    this.name = inputNameMatch && inputNameMatch[1] || '';
    this.fileName = fileNameMatch && fileNameMatch[1] || '';
  }

  _setContentDisposition(name, fileName) {
    this.name = name;
    this.fileName = fileName;
    this._headers['Content-Disposition'] = `form-data; name="${name}"; filename="${fileName}"`;
  } // API


  addFileInfo(fileInfo, idx) {
    const file = fileInfo.files[idx];

    this._setContentDisposition(fileInfo.name, file.name);

    this.body = [Buffer.from(file.data, 'base64')];
    this._headers['Content-Type'] = file.type;
  }

  setHeader(header, newValue) {
    const headerMatch = header.match(HEADER_RE);
    const name = headerMatch && headerMatch[1] || '';
    const value = newValue || headerMatch && headerMatch[2] || '';
    this._headers[name] = value;
    if (name === 'Content-Disposition') this._parseContentDisposition(value);
  }

  toBuffer() {
    const chunks = [];

    for (const name of Object.keys(this._headers)) {
      const value = this._headers[name];
      chunks.push(Buffer.from(`${name}: ${value}`));
      chunks.push(bufferUtils.CRLF);
    }

    chunks.push(bufferUtils.CRLF);
    return Buffer.concat(chunks.concat(this.body));
  }

}

exports.default = FormDataEntry;
module.exports = exports.default;