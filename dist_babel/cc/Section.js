"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Section = exports.childGap = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _styles = require("./styles");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// gap, in pixels, between each immediate child in a section
const childGap = _styles.layout.gap;
exports.childGap = childGap;
const Section = (0, _base.default)("section", process.env.NODE_ENV === "production" ? {
  target: "e1ejpwsp0"
} : {
  target: "e1ejpwsp0",
  label: "Section"
})(function () {
  return { ...(0, _styles.mixinFlexColumnGaps)(childGap)
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9TZWN0aW9uLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU11QiIsImZpbGUiOiIuLi8uLi9zcmMvY2MvU2VjdGlvbi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzdHlsZWQgZnJvbSAnQGVtb3Rpb24vc3R5bGVkJztcbmltcG9ydCB7IG1peGluRmxleENvbHVtbkdhcHMsIGxheW91dCB9IGZyb20gJy4vc3R5bGVzJztcblxuLy8gZ2FwLCBpbiBwaXhlbHMsIGJldHdlZW4gZWFjaCBpbW1lZGlhdGUgY2hpbGQgaW4gYSBzZWN0aW9uXG5leHBvcnQgY29uc3QgY2hpbGRHYXAgPSBsYXlvdXQuZ2FwO1xuXG5leHBvcnQgY29uc3QgU2VjdGlvbiA9IHN0eWxlZC5zZWN0aW9uKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5taXhpbkZsZXhDb2x1bW5HYXBzKGNoaWxkR2FwKSxcbiAgfTtcbn0pO1xuIl19 */");
exports.Section = Section;