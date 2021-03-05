"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.InfoPanel = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _extensions = require("@k8slens/extensions");

var _styles = require("./styles");

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Info Message
//
const Info = (0, _base.default)("p", process.env.NODE_ENV === "production" ? {
  target: "e1vw4dlh1"
} : {
  target: "e1vw4dlh1",
  label: "Info"
})(function () {
  return {
    marginTop: 2,
    // to center with icon
    marginLeft: _styles.layout.pad
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9JbmZvUGFuZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU2EiLCJmaWxlIjoiLi4vLi4vc3JjL2NjL0luZm9QYW5lbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vXG4vLyBJbmZvIE1lc3NhZ2Vcbi8vXG5cbmltcG9ydCBwcm9wVHlwZXMgZnJvbSAncHJvcC10eXBlcyc7XG5pbXBvcnQgc3R5bGVkIGZyb20gJ0BlbW90aW9uL3N0eWxlZCc7XG5pbXBvcnQgeyBDb21wb25lbnQgfSBmcm9tICdAazhzbGVucy9leHRlbnNpb25zJztcbmltcG9ydCB7IGxheW91dCB9IGZyb20gJy4vc3R5bGVzJztcblxuY29uc3QgSW5mbyA9IHN0eWxlZC5wKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBtYXJnaW5Ub3A6IDIsIC8vIHRvIGNlbnRlciB3aXRoIGljb25cbiAgICBtYXJnaW5MZWZ0OiBsYXlvdXQucGFkLFxuICB9O1xufSk7XG5cbmNvbnN0IFBhbmVsID0gc3R5bGVkLmRpdihmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgZGlzcGxheTogJ2ZsZXgnLFxuICAgIGFsaWduSXRlbXM6ICdmbGV4LXN0YXJ0JywgLy8gbWFrZSBzdXJlIGFsbCBjb250ZW50IHZpc2libGUgaWYgbmVlZHMgc2Nyb2xsaW5nXG4gICAgYmFja2dyb3VuZENvbG9yOiAndmFyKC0tY29sb3JJbmZvKScsXG4gICAgYm9yZGVyQ29sb3I6ICd0cmFuc3BhcmVudCcsXG4gICAgYm9yZGVyV2lkdGg6IDEsXG4gICAgYm9yZGVyU3R5bGU6ICdzb2xpZCcsXG4gICAgYm9yZGVyUmFkaXVzOiBsYXlvdXQuZ3JpZCxcbiAgICBjb2xvcjogJ3doaXRlJyxcbiAgICBwYWRkaW5nOiBsYXlvdXQucGFkLFxuICAgIG1heEhlaWdodDogMTAwLFxuICAgIG92ZXJmbG93OiAnYXV0bycsXG4gIH07XG59KTtcblxuZXhwb3J0IGNvbnN0IEluZm9QYW5lbCA9IGZ1bmN0aW9uICh7IGNoaWxkcmVuIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8UGFuZWw+XG4gICAgICA8Q29tcG9uZW50Lkljb24gbWF0ZXJpYWw9XCJpbmZvX291dGxpbmVcIiAvPlxuICAgICAgPEluZm8+e2NoaWxkcmVufTwvSW5mbz5cbiAgICA8L1BhbmVsPlxuICApO1xufTtcblxuSW5mb1BhbmVsLnByb3BUeXBlcyA9IHtcbiAgLy8gemVybyBvciBtb3JlIGNoaWxkIG5vZGVzXG4gIGNoaWxkcmVuOiBwcm9wVHlwZXMub25lT2ZUeXBlKFtcbiAgICBwcm9wVHlwZXMuYXJyYXlPZihwcm9wVHlwZXMubm9kZSksXG4gICAgcHJvcFR5cGVzLm5vZGUsXG4gIF0pLFxufTtcbiJdfQ== */");
const Panel = (0, _base.default)("div", process.env.NODE_ENV === "production" ? {
  target: "e1vw4dlh0"
} : {
  target: "e1vw4dlh0",
  label: "Panel"
})(function () {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    // make sure all content visible if needs scrolling
    backgroundColor: 'var(--colorInfo)',
    borderColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: _styles.layout.grid,
    color: 'white',
    padding: _styles.layout.pad,
    maxHeight: 100,
    overflow: 'auto'
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9JbmZvUGFuZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0JjIiwiZmlsZSI6Ii4uLy4uL3NyYy9jYy9JbmZvUGFuZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvL1xuLy8gSW5mbyBNZXNzYWdlXG4vL1xuXG5pbXBvcnQgcHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMnO1xuaW1wb3J0IHN0eWxlZCBmcm9tICdAZW1vdGlvbi9zdHlsZWQnO1xuaW1wb3J0IHsgQ29tcG9uZW50IH0gZnJvbSAnQGs4c2xlbnMvZXh0ZW5zaW9ucyc7XG5pbXBvcnQgeyBsYXlvdXQgfSBmcm9tICcuL3N0eWxlcyc7XG5cbmNvbnN0IEluZm8gPSBzdHlsZWQucChmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgbWFyZ2luVG9wOiAyLCAvLyB0byBjZW50ZXIgd2l0aCBpY29uXG4gICAgbWFyZ2luTGVmdDogbGF5b3V0LnBhZCxcbiAgfTtcbn0pO1xuXG5jb25zdCBQYW5lbCA9IHN0eWxlZC5kaXYoZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIGRpc3BsYXk6ICdmbGV4JyxcbiAgICBhbGlnbkl0ZW1zOiAnZmxleC1zdGFydCcsIC8vIG1ha2Ugc3VyZSBhbGwgY29udGVudCB2aXNpYmxlIGlmIG5lZWRzIHNjcm9sbGluZ1xuICAgIGJhY2tncm91bmRDb2xvcjogJ3ZhcigtLWNvbG9ySW5mbyknLFxuICAgIGJvcmRlckNvbG9yOiAndHJhbnNwYXJlbnQnLFxuICAgIGJvcmRlcldpZHRoOiAxLFxuICAgIGJvcmRlclN0eWxlOiAnc29saWQnLFxuICAgIGJvcmRlclJhZGl1czogbGF5b3V0LmdyaWQsXG4gICAgY29sb3I6ICd3aGl0ZScsXG4gICAgcGFkZGluZzogbGF5b3V0LnBhZCxcbiAgICBtYXhIZWlnaHQ6IDEwMCxcbiAgICBvdmVyZmxvdzogJ2F1dG8nLFxuICB9O1xufSk7XG5cbmV4cG9ydCBjb25zdCBJbmZvUGFuZWwgPSBmdW5jdGlvbiAoeyBjaGlsZHJlbiB9KSB7XG4gIHJldHVybiAoXG4gICAgPFBhbmVsPlxuICAgICAgPENvbXBvbmVudC5JY29uIG1hdGVyaWFsPVwiaW5mb19vdXRsaW5lXCIgLz5cbiAgICAgIDxJbmZvPntjaGlsZHJlbn08L0luZm8+XG4gICAgPC9QYW5lbD5cbiAgKTtcbn07XG5cbkluZm9QYW5lbC5wcm9wVHlwZXMgPSB7XG4gIC8vIHplcm8gb3IgbW9yZSBjaGlsZCBub2Rlc1xuICBjaGlsZHJlbjogcHJvcFR5cGVzLm9uZU9mVHlwZShbXG4gICAgcHJvcFR5cGVzLmFycmF5T2YocHJvcFR5cGVzLm5vZGUpLFxuICAgIHByb3BUeXBlcy5ub2RlLFxuICBdKSxcbn07XG4iXX0= */");

const InfoPanel = function ({
  children
}) {
  return (0, _jsxRuntime.jsxs)(Panel, {
    children: [(0, _jsxRuntime.jsx)(_extensions.Component.Icon, {
      material: "info_outline"
    }), (0, _jsxRuntime.jsx)(Info, {
      children: children
    })]
  });
};

exports.InfoPanel = InfoPanel;
InfoPanel.propTypes = {
  // zero or more child nodes
  children: _propTypes.default.oneOfType([_propTypes.default.arrayOf(_propTypes.default.node), _propTypes.default.node])
};