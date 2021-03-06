"use strict";

exports.__esModule = true;
exports.default = void 0;

var _nodeBuilder = require("../node-builder");

var _esotopeHammerhead = require("esotope-hammerhead");

var _replaceNode = _interopRequireDefault(require("./replace-node"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// -------------------------------------------------------------
// WARNING: this file is used by both the client and the server.
// Do not use any browser or node-specific API!
// -------------------------------------------------------------

/*eslint-disable no-unused-vars*/

/*eslint-enable no-unused-vars*/
// Transform:
// location.field; location[field] -->
// __get$Loc(location).field; __get$Loc(location)[field];
const transformer = {
  nodeReplacementRequireTransform: false,
  nodeTypes: _esotopeHammerhead.Syntax.MemberExpression,
  condition: (node, parent) => {
    // Skip: for(location.field in obj)
    if (parent && parent.type === _esotopeHammerhead.Syntax.ForInStatement && parent.left === node) return false;
    return node.object.type === _esotopeHammerhead.Syntax.Identifier && node.object.name === 'location';
  },
  run: node => {
    (0, _replaceNode.default)(node.object, (0, _nodeBuilder.createLocationGetWrapper)(), node, 'object');
    return null;
  }
};
var _default = transformer;
exports.default = _default;
module.exports = exports.default;