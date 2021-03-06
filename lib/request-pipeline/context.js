"use strict";

exports.__esModule = true;
exports.default = void 0;

var _cookie = require("../utils/cookie");

var _headers = _interopRequireDefault(require("./xhr/headers"));

var _charset = _interopRequireDefault(require("../processing/encoding/charset"));

var urlUtils = _interopRequireWildcard(require("../utils/url"));

var contentTypeUtils = _interopRequireWildcard(require("../utils/content-type"));

var _generateUniqueId = _interopRequireDefault(require("../utils/generate-unique-id"));

var _sameOriginPolicy = require("./xhr/same-origin-policy");

var headerTransforms = _interopRequireWildcard(require("./header-transforms"));

var _info = require("../session/events/info");

var _serviceRoutes = _interopRequireDefault(require("../proxy/service-routes"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
const CANNOT_BE_USED_WITH_WEB_SOCKET_ERR_MSG = 'The function cannot be used with a WebSocket request.';

class RequestPipelineContext {
  constructor(req, res, serverInfo) {
    _defineProperty(this, "serverInfo", void 0);

    _defineProperty(this, "req", void 0);

    _defineProperty(this, "res", void 0);

    _defineProperty(this, "session", null);

    _defineProperty(this, "reqBody", null);

    _defineProperty(this, "dest", null);

    _defineProperty(this, "destRes", null);

    _defineProperty(this, "isDestResReadableEnded", false);

    _defineProperty(this, "destResBody", null);

    _defineProperty(this, "isXhr", false);

    _defineProperty(this, "isFetch", false);

    _defineProperty(this, "isPage", false);

    _defineProperty(this, "isHTMLPage", false);

    _defineProperty(this, "isHtmlImport", false);

    _defineProperty(this, "isWebSocket", false);

    _defineProperty(this, "isIframe", false);

    _defineProperty(this, "isSpecialPage", false);

    _defineProperty(this, "isWebSocketConnectionReset", false);

    _defineProperty(this, "contentInfo", null);

    _defineProperty(this, "restoringStorages", null);

    _defineProperty(this, "requestId", (0, _generateUniqueId.default)());

    _defineProperty(this, "requestFilterRules", []);

    _defineProperty(this, "onResponseEventData", []);

    _defineProperty(this, "reqOpts", null);

    _defineProperty(this, "parsedClientSyncCookie", void 0);

    _defineProperty(this, "isFileProtocol", void 0);

    _defineProperty(this, "nonProcessedDestResBody", null);

    _defineProperty(this, "goToNextStage", true);

    _defineProperty(this, "mock", void 0);

    _defineProperty(this, "isSameOriginPolicyFailed", false);

    _defineProperty(this, "windowId", void 0);

    this.serverInfo = serverInfo;
    this.req = req;
    this.res = res;
    const acceptHeader = req.headers['accept'];
    this.isXhr = !!req.headers[_headers.default.requestMarker];
    this.isFetch = !!req.headers[_headers.default.fetchRequestCredentials];
    this.isPage = !this.isXhr && !this.isFetch && !!acceptHeader && contentTypeUtils.isPage(acceptHeader);
    this.parsedClientSyncCookie = req.headers.cookie && (0, _cookie.parseClientSyncCookieStr)(req.headers.cookie);
  } // TODO: Rewrite parseProxyUrl instead.


  static _flattenParsedProxyUrl(parsed) {
    if (!parsed) return null;
    const parsedResourceType = urlUtils.parseResourceType(parsed.resourceType);
    const dest = {
      url: parsed.destUrl,
      protocol: parsed.destResourceInfo.protocol,
      host: parsed.destResourceInfo.host,
      hostname: parsed.destResourceInfo.hostname,
      port: parsed.destResourceInfo.port,
      partAfterHost: parsed.destResourceInfo.partAfterHost,
      auth: parsed.destResourceInfo.auth,
      isIframe: parsedResourceType.isIframe,
      isForm: parsedResourceType.isForm,
      isScript: parsedResourceType.isScript,
      isEventSource: parsedResourceType.isEventSource,
      isHtmlImport: parsedResourceType.isHtmlImport,
      isWebSocket: parsedResourceType.isWebSocket,
      charset: parsed.charset,
      reqOrigin: parsed.reqOrigin
    };
    return {
      dest,
      sessionId: parsed.sessionId,
      windowId: parsed.windowId
    };
  }

  _isFileDownload() {
    const contentDisposition = this.destRes.headers['content-disposition'];
    return !!contentDisposition && contentDisposition.includes('attachment') && contentDisposition.includes('filename');
  }

  _resolveInjectableUrls(injectableUrls) {
    return injectableUrls.map(url => this.serverInfo.domain + url);
  }

  _initRequestNatureInfo() {
    const acceptHeader = this.req.headers['accept'];
    this.isWebSocket = this.dest.isWebSocket;
    this.isHtmlImport = this.dest.isHtmlImport;
    this.isPage = !this.isXhr && !this.isFetch && !this.isWebSocket && acceptHeader && contentTypeUtils.isPage(acceptHeader) || this.isHtmlImport;
    this.isIframe = this.dest.isIframe;
    this.isSpecialPage = urlUtils.isSpecialPage(this.dest.url);
    this.isFileProtocol = this.dest.protocol === 'file:';
    this.isHTMLPage = this.isPage && !this.isIframe && !this.isHtmlImport;
  }

  _getDestFromReferer(parsedReferer) {
    const dest = parsedReferer.dest;
    dest.partAfterHost = this.req.url;
    dest.url = urlUtils.formatUrl(dest);
    return {
      dest,
      sessionId: parsedReferer.sessionId,
      windowId: parsedReferer.windowId
    };
  } // API


  dispatch(openSessions) {
    const parsedReqUrl = urlUtils.parseProxyUrl(this.req.url);
    const referer = this.req.headers['referer'];
    const parsedReferer = referer && urlUtils.parseProxyUrl(referer); // TODO: Remove it after parseProxyURL is rewritten.

    let flattenParsedReqUrl = RequestPipelineContext._flattenParsedProxyUrl(parsedReqUrl);

    const flattenParsedReferer = RequestPipelineContext._flattenParsedProxyUrl(parsedReferer); // NOTE: Remove that after implementing the https://github.com/DevExpress/testcafe-hammerhead/issues/2155


    if (!flattenParsedReqUrl && flattenParsedReferer) flattenParsedReqUrl = this._getDestFromReferer(flattenParsedReferer);
    if (!flattenParsedReqUrl) return false;
    this.session = openSessions.get(flattenParsedReqUrl.sessionId);
    if (!this.session) return false;
    this.dest = flattenParsedReqUrl.dest;
    this.windowId = flattenParsedReqUrl.windowId;
    this.dest.partAfterHost = this._preparePartAfterHost(this.dest.partAfterHost);
    this.dest.domain = urlUtils.getDomain(this.dest);

    if (flattenParsedReferer) {
      this.dest.referer = flattenParsedReferer.dest.url;
      this.dest.reqOrigin = flattenParsedReferer.dest.protocol === 'file:' ? flattenParsedReferer.dest.url : urlUtils.getDomain(flattenParsedReferer.dest);
    } else if (this.req.headers[_headers.default.origin]) this.dest.reqOrigin = this.req.headers[_headers.default.origin];

    this._initRequestNatureInfo();

    this._applyClientSyncCookie();

    return true;
  }

  _applyClientSyncCookie() {
    if (!this.parsedClientSyncCookie) return;
    const clientCookie = this.parsedClientSyncCookie.actual.filter(syncCookie => syncCookie.isClientSync && syncCookie.sid === this.session.id);
    this.session.cookies.setByClient(clientCookie);
  }

  _preparePartAfterHost(str) {
    // Browsers add a leading slash to the pathname part of url (GH-608)
    // For example: url http://www.example.com?gd=GID12082014 will be converted
    // to http://www.example.com/?gd=GID12082014
    return (str[0] === '/' ? '' : '/') + str;
  }

  buildContentInfo() {
    const contentType = this.destRes.headers['content-type'] || '';
    const accept = this.req.headers['accept'] || '';
    const encoding = this.destRes.headers['content-encoding'];
    if (this.isPage && contentType) this.isPage = !this.isXhr && !this.isFetch && contentTypeUtils.isPage(contentType);
    const isCSS = contentTypeUtils.isCSSResource(contentType, accept);
    const isManifest = contentTypeUtils.isManifest(contentType);
    const isScript = this.dest.isScript || contentTypeUtils.isScriptResource(contentType, accept);
    const isForm = this.dest.isForm;
    const isFormWithEmptyResponse = isForm && this.destRes.statusCode === 204;
    const isRedirect = this.destRes.headers['location'] && REDIRECT_STATUS_CODES.includes(this.destRes.statusCode);
    const requireAssetsProcessing = (isCSS || isScript || isManifest) && this.destRes.statusCode !== 204;
    const isNotModified = this.req.method === 'GET' && this.destRes.statusCode === 304 && !!(this.req.headers['if-modified-since'] || this.req.headers['if-none-match']);
    const requireProcessing = !this.isXhr && !this.isFetch && !isFormWithEmptyResponse && !isRedirect && !isNotModified && (this.isPage || this.isIframe || requireAssetsProcessing);
    const isFileDownload = this._isFileDownload() && !this.dest.isScript;
    const isIframeWithImageSrc = this.isIframe && !this.isPage && /^\s*image\//.test(contentType);
    let charset = null;
    const contentTypeUrlToken = urlUtils.getResourceTypeString({
      isIframe: this.isIframe,
      isForm: isForm,
      isScript: isScript
    }); // NOTE: We need charset information if we are going to process the resource.

    if (requireProcessing) {
      charset = new _charset.default();
      if (!charset.fromContentType(contentType)) charset.fromUrl(this.dest.charset);
    }

    if (isFileDownload) this.session.handleFileDownload();
    this.contentInfo = {
      charset,
      requireProcessing,
      isIframeWithImageSrc,
      isCSS,
      isScript,
      isManifest,
      encoding,
      contentTypeUrlToken,
      isFileDownload,
      isNotModified,
      isRedirect
    };
  }

  _getInjectableUserScripts() {
    const requestInfo = new _info.RequestInfo(this);
    return this.session.injectable.userScripts.filter(userScript => userScript.page.match(requestInfo)).map(userScript => userScript.url);
  }

  getInjectableScripts() {
    const taskScript = this.isIframe ? _serviceRoutes.default.iframeTask : _serviceRoutes.default.task;
    const scripts = this.session.injectable.scripts.concat(taskScript, this._getInjectableUserScripts());
    return this._resolveInjectableUrls(scripts);
  }

  getInjectableStyles() {
    return this._resolveInjectableUrls(this.session.injectable.styles);
  }

  redirect(url) {
    if (this.isWebSocket) throw new Error(CANNOT_BE_USED_WITH_WEB_SOCKET_ERR_MSG);
    const res = this.res;
    res.statusCode = 302;
    res.setHeader('location', url);
    res.end();
  }

  saveNonProcessedDestResBody(value) {
    this.nonProcessedDestResBody = value;
  }

  closeWithError(statusCode, resBody = '') {
    if ('setHeader' in this.res && !this.res.headersSent) {
      this.res.statusCode = statusCode;
      this.res.setHeader('content-type', 'text/html');
      this.res.write(resBody);
    }

    this.res.end();
    this.goToNextStage = false;
  }

  toProxyUrl(url, isCrossDomain, resourceType, charset) {
    const proxyHostname = this.serverInfo.hostname;
    const proxyProtocol = this.serverInfo.protocol;
    const proxyPort = isCrossDomain ? this.serverInfo.crossDomainPort : this.serverInfo.port;
    const sessionId = this.session.id;
    const windowId = this.windowId;
    return urlUtils.getProxyUrl(url, {
      proxyHostname,
      proxyProtocol,
      proxyPort,
      sessionId,
      resourceType,
      charset,
      windowId
    });
  }

  isPassSameOriginPolicy() {
    const isAjaxRequest = this.isXhr || this.isFetch;
    const shouldPerformCORSCheck = isAjaxRequest && !this.contentInfo.isNotModified;
    return !shouldPerformCORSCheck || (0, _sameOriginPolicy.check)(this);
  }

  async forEachRequestFilterRule(fn) {
    await Promise.all(this.requestFilterRules.map(fn));
  }

  sendResponseHeaders() {
    if (this.isWebSocket) throw new Error(CANNOT_BE_USED_WITH_WEB_SOCKET_ERR_MSG);
    const headers = headerTransforms.forResponse(this);
    const res = this.res;
    if (this.isHTMLPage && this.session.disablePageCaching) headerTransforms.setupPreventCachingHeaders(headers);
    res.writeHead(this.destRes.statusCode, headers);
    res.addTrailers(this.destRes.trailers);
  }

  async mockResponse() {
    this.mock.setRequestOptions(this.reqOpts);
    this.destRes = await this.mock.getResponse();
  }

  setupMockIfNecessary(rule) {
    const mock = this.session.getMock(rule);
    if (mock && !this.mock) this.mock = mock;
  }

  isDestResBodyMalformed() {
    return !this.destResBody || this.destResBody.length.toString() !== this.destRes.headers['content-length'];
  }

  getOnResponseEventData({
    includeBody
  }) {
    return this.onResponseEventData.filter(eventData => eventData.opts.includeBody === includeBody);
  }

}

exports.default = RequestPipelineContext;
module.exports = exports.default;