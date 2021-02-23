"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ErrorPanel = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _extensions = require("@k8slens/extensions");

var _styles = require("./styles");

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Error Message
//
const Error = (0, _base.default)("p", process.env.NODE_ENV === "production" ? {
  target: "ek99ifi1"
} : {
  target: "ek99ifi1",
  label: "Error"
})(function () {
  return {
    marginTop: 2,
    // to center with icon
    marginLeft: _styles.layout.pad
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9FcnJvclBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVNjIiwiZmlsZSI6Ii4uLy4uL3NyYy9jYy9FcnJvclBhbmVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy9cbi8vIEVycm9yIE1lc3NhZ2Vcbi8vXG5cbmltcG9ydCBwcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XG5pbXBvcnQgc3R5bGVkIGZyb20gJ0BlbW90aW9uL3N0eWxlZCc7XG5pbXBvcnQgeyBDb21wb25lbnQgfSBmcm9tICdAazhzbGVucy9leHRlbnNpb25zJztcbmltcG9ydCB7IGxheW91dCB9IGZyb20gJy4vc3R5bGVzJztcblxuY29uc3QgRXJyb3IgPSBzdHlsZWQucChmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgbWFyZ2luVG9wOiAyLCAvLyB0byBjZW50ZXIgd2l0aCBpY29uXG4gICAgbWFyZ2luTGVmdDogbGF5b3V0LnBhZCxcbiAgfTtcbn0pO1xuXG5jb25zdCBQYW5lbCA9IHN0eWxlZC5kaXYoZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIGRpc3BsYXk6ICdmbGV4JyxcbiAgICBhbGlnbkl0ZW1zOiAnZmxleC1zdGFydCcsIC8vIG1ha2Ugc3VyZSBhbGwgY29udGVudCB2aXNpYmxlIGlmIG5lZWRzIHNjcm9sbGluZ1xuICAgIGJhY2tncm91bmRDb2xvcjogJ3ZhcigtLWNvbG9yRXJyb3IpJyxcbiAgICBib3JkZXJDb2xvcjogJ3ZhcigtLWNvbG9yU29mdEVycm9yKScsXG4gICAgYm9yZGVyV2lkdGg6IDEsXG4gICAgYm9yZGVyU3R5bGU6ICdzb2xpZCcsXG4gICAgYm9yZGVyUmFkaXVzOiBsYXlvdXQuZ3JpZCxcbiAgICBjb2xvcjogJ3doaXRlJyxcbiAgICBwYWRkaW5nOiBsYXlvdXQucGFkLFxuICAgIG1heEhlaWdodDogMTAwLFxuICAgIG92ZXJmbG93OiAnYXV0bycsXG4gIH07XG59KTtcblxuZXhwb3J0IGNvbnN0IEVycm9yUGFuZWwgPSBmdW5jdGlvbiAoeyBjaGlsZHJlbiB9KSB7XG4gIHJldHVybiAoXG4gICAgPFBhbmVsPlxuICAgICAgPENvbXBvbmVudC5JY29uIG1hdGVyaWFsPVwiZXJyb3Jfb3V0bGluZVwiIC8+XG4gICAgICA8RXJyb3I+e2NoaWxkcmVufTwvRXJyb3I+XG4gICAgPC9QYW5lbD5cbiAgKTtcbn07XG5cbkVycm9yUGFuZWwucHJvcFR5cGVzID0ge1xuICAvLyB6ZXJvIG9yIG1vcmUgY2hpbGQgbm9kZXNcbiAgY2hpbGRyZW46IHByb3BUeXBlcy5vbmVPZlR5cGUoW1xuICAgIHByb3BUeXBlcy5hcnJheU9mKHByb3BUeXBlcy5ub2RlKSxcbiAgICBwcm9wVHlwZXMubm9kZSxcbiAgXSksXG59O1xuIl19 */");
const Panel = (0, _base.default)("div", process.env.NODE_ENV === "production" ? {
  target: "ek99ifi0"
} : {
  target: "ek99ifi0",
  label: "Panel"
})(function () {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    // make sure all content visible if needs scrolling
    backgroundColor: 'var(--colorError)',
    borderColor: 'var(--colorSoftError)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: _styles.layout.grid,
    color: 'white',
    padding: _styles.layout.pad,
    maxHeight: 100,
    overflow: 'auto'
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9FcnJvclBhbmVsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWdCYyIsImZpbGUiOiIuLi8uLi9zcmMvY2MvRXJyb3JQYW5lbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vXG4vLyBFcnJvciBNZXNzYWdlXG4vL1xuXG5pbXBvcnQgcHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMnO1xuaW1wb3J0IHN0eWxlZCBmcm9tICdAZW1vdGlvbi9zdHlsZWQnO1xuaW1wb3J0IHsgQ29tcG9uZW50IH0gZnJvbSAnQGs4c2xlbnMvZXh0ZW5zaW9ucyc7XG5pbXBvcnQgeyBsYXlvdXQgfSBmcm9tICcuL3N0eWxlcyc7XG5cbmNvbnN0IEVycm9yID0gc3R5bGVkLnAoZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIG1hcmdpblRvcDogMiwgLy8gdG8gY2VudGVyIHdpdGggaWNvblxuICAgIG1hcmdpbkxlZnQ6IGxheW91dC5wYWQsXG4gIH07XG59KTtcblxuY29uc3QgUGFuZWwgPSBzdHlsZWQuZGl2KGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBkaXNwbGF5OiAnZmxleCcsXG4gICAgYWxpZ25JdGVtczogJ2ZsZXgtc3RhcnQnLCAvLyBtYWtlIHN1cmUgYWxsIGNvbnRlbnQgdmlzaWJsZSBpZiBuZWVkcyBzY3JvbGxpbmdcbiAgICBiYWNrZ3JvdW5kQ29sb3I6ICd2YXIoLS1jb2xvckVycm9yKScsXG4gICAgYm9yZGVyQ29sb3I6ICd2YXIoLS1jb2xvclNvZnRFcnJvciknLFxuICAgIGJvcmRlcldpZHRoOiAxLFxuICAgIGJvcmRlclN0eWxlOiAnc29saWQnLFxuICAgIGJvcmRlclJhZGl1czogbGF5b3V0LmdyaWQsXG4gICAgY29sb3I6ICd3aGl0ZScsXG4gICAgcGFkZGluZzogbGF5b3V0LnBhZCxcbiAgICBtYXhIZWlnaHQ6IDEwMCxcbiAgICBvdmVyZmxvdzogJ2F1dG8nLFxuICB9O1xufSk7XG5cbmV4cG9ydCBjb25zdCBFcnJvclBhbmVsID0gZnVuY3Rpb24gKHsgY2hpbGRyZW4gfSkge1xuICByZXR1cm4gKFxuICAgIDxQYW5lbD5cbiAgICAgIDxDb21wb25lbnQuSWNvbiBtYXRlcmlhbD1cImVycm9yX291dGxpbmVcIiAvPlxuICAgICAgPEVycm9yPntjaGlsZHJlbn08L0Vycm9yPlxuICAgIDwvUGFuZWw+XG4gICk7XG59O1xuXG5FcnJvclBhbmVsLnByb3BUeXBlcyA9IHtcbiAgLy8gemVybyBvciBtb3JlIGNoaWxkIG5vZGVzXG4gIGNoaWxkcmVuOiBwcm9wVHlwZXMub25lT2ZUeXBlKFtcbiAgICBwcm9wVHlwZXMuYXJyYXlPZihwcm9wVHlwZXMubm9kZSksXG4gICAgcHJvcFR5cGVzLm5vZGUsXG4gIF0pLFxufTtcbiJdfQ== */");

const ErrorPanel = function ({
  children
}) {
  return (0, _jsxRuntime.jsxs)(Panel, {
    children: [(0, _jsxRuntime.jsx)(_extensions.Component.Icon, {
      material: "error_outline"
    }), (0, _jsxRuntime.jsx)(Error, {
      children: children
    })]
  });
};

exports.ErrorPanel = ErrorPanel;
ErrorPanel.propTypes = {
  // zero or more child nodes
  children: _propTypes.default.oneOfType([_propTypes.default.arrayOf(_propTypes.default.node), _propTypes.default.node])
};