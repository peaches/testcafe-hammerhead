"use strict";

exports.__esModule = true;
exports.createElement = createElement;
exports.unshiftElement = unshiftElement;
exports.insertBeforeFirstScript = insertBeforeFirstScript;
exports.removeNode = removeNode;
exports.findElementsByTagNames = findElementsByTagNames;
exports.walkElements = walkElements;
exports.createTextNode = createTextNode;
exports.removeAttr = removeAttr;
exports.getAttr = getAttr;
exports.setAttr = setAttr;

var _namespaces = require("../processing/dom/namespaces");

const ATTR_NAMESPACE_LOCAL_NAME_SEPARATOR = ':';

function getAttrName(attr) {
  return attr.prefix ? attr.prefix + ATTR_NAMESPACE_LOCAL_NAME_SEPARATOR + attr.name : attr.name;
}

function parseAttrName(attr) {
  const parts = attr.split(ATTR_NAMESPACE_LOCAL_NAME_SEPARATOR);

  if (parts.length === 2) {
    return {
      prefix: parts[0],
      name: parts[1]
    };
  }

  return {
    name: parts[0]
  };
}

function findAttr(el, name) {
  for (let i = 0; i < el.attrs.length; i++) {
    if (getAttrName(el.attrs[i]) === name) return el.attrs[i];
  }

  return null;
}

function createElement(tagName, attrs) {
  return {
    nodeName: tagName,
    tagName: tagName,
    attrs: attrs,
    childNodes: []
  };
}

function unshiftElement(el, parent) {
  el.namespaceURI = parent.namespaceURI;
  el.parentNode = parent;
  parent.childNodes.unshift(el);
}

function insertBeforeFirstScript(el, parent) {
  el.namespaceURI = parent.namespaceURI;
  el.parentNode = parent;
  const firstScriptIndex = parent.childNodes.findIndex(node => node.tagName === 'script');
  const elIndex = firstScriptIndex !== -1 ? firstScriptIndex : parent.childNodes.length;
  parent.childNodes.splice(elIndex, 0, el);
}

function removeNode(node) {
  const parent = node.parentNode;
  const elIndex = parent.childNodes.indexOf(node);
  parent.childNodes.splice(elIndex, 1);
}

function findElementsByTagNames(root, tagNames) {
  const elements = {};
  walkElements(root, el => {
    if (tagNames.includes(el.tagName)) {
      elements[el.tagName] = elements[el.tagName] || [];
      elements[el.tagName].push(el);
    }
  });
  return elements;
}

function walkElements(el, processor) {
  if (el.nodeName !== '#document' && el.nodeName !== '#text' && el.nodeName !== '#documentType' && el.nodeName !== '#comment') processor(el);
  if (el.childNodes) el.childNodes.forEach(child => walkElements(child, processor));
}

function createTextNode(content, parent) {
  return {
    nodeName: '#text',
    value: content,
    parentNode: parent
  };
}

function removeAttr(el, name) {
  for (let i = 0; i < el.attrs.length; i++) {
    if (getAttrName(el.attrs[i]) === name) {
      el.attrs.splice(i, 1);
      return;
    }
  }
}

function getAttr(el, name) {
  const attr = findAttr(el, name);
  return attr ? attr.value : null;
}

function setAttr(el, name, value) {
  const attr = findAttr(el, name);

  if (attr) {
    attr.value = value;
    return value;
  }

  const parsedAttrName = parseAttrName(name);
  const newAttr = {
    name: parsedAttrName.name,
    value: value,
    namespace: void 0
  };
  if (parsedAttrName.prefix && _namespaces.NAMESPACE_PREFIX_MAP[parsedAttrName.prefix]) newAttr.namespace = _namespaces.NAMESPACE_PREFIX_MAP[parsedAttrName.prefix];
  el.attrs.push(newAttr);
  return value;
}