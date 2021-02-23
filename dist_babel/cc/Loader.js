"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Loader = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _extensions = require("@k8slens/extensions");

var _styles = require("./styles");

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// A Lens Spinner with a message.
//
const Wrapper = (0, _base.default)("div", process.env.NODE_ENV === "production" ? {
  target: "ebsfl8s0"
} : {
  target: "ebsfl8s0",
  label: "Wrapper"
})(function () {
  return {
    display: 'flex',
    alignItems: 'center',
    p: {
      marginLeft: _styles.layout.pad
    }
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9Mb2FkZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU2dCIiwiZmlsZSI6Ii4uLy4uL3NyYy9jYy9Mb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvL1xuLy8gQSBMZW5zIFNwaW5uZXIgd2l0aCBhIG1lc3NhZ2UuXG4vL1xuXG5pbXBvcnQgcHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMnO1xuaW1wb3J0IHN0eWxlZCBmcm9tICdAZW1vdGlvbi9zdHlsZWQnO1xuaW1wb3J0IHsgQ29tcG9uZW50IH0gZnJvbSAnQGs4c2xlbnMvZXh0ZW5zaW9ucyc7XG5pbXBvcnQgeyBsYXlvdXQgfSBmcm9tICcuL3N0eWxlcyc7XG5cbmNvbnN0IFdyYXBwZXIgPSBzdHlsZWQuZGl2KGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBkaXNwbGF5OiAnZmxleCcsXG4gICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXG5cbiAgICBwOiB7XG4gICAgICBtYXJnaW5MZWZ0OiBsYXlvdXQucGFkLFxuICAgIH0sXG4gIH07XG59KTtcblxuZXhwb3J0IGNvbnN0IExvYWRlciA9IGZ1bmN0aW9uICh7IG1lc3NhZ2UsIC4uLnNwaW5Qcm9wcyB9KSB7XG4gIGNvbnN0IHNwaW5uZXIgPSA8Q29tcG9uZW50LlNwaW5uZXIgey4uLnNwaW5Qcm9wc30gLz47XG4gIGNvbnN0IHByb3BzID1cbiAgICBtZXNzYWdlICYmIG1lc3NhZ2UuaW5jbHVkZXMoJzwnKVxuICAgICAgPyB7IGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7IF9faHRtbDogbWVzc2FnZSB9IH1cbiAgICAgIDogdW5kZWZpbmVkO1xuXG4gIHJldHVybiBtZXNzYWdlID8gKFxuICAgIDxXcmFwcGVyPlxuICAgICAge3NwaW5uZXJ9XG4gICAgICA8cCB7Li4ucHJvcHN9Pntwcm9wcyA/IHVuZGVmaW5lZCA6IG1lc3NhZ2V9PC9wPlxuICAgIDwvV3JhcHBlcj5cbiAgKSA6IChcbiAgICBzcGlubmVyXG4gICk7XG59O1xuXG5Mb2FkZXIucHJvcFR5cGVzID0ge1xuICBtZXNzYWdlOiBwcm9wVHlwZXMuc3RyaW5nLCAvLyBjYW4gY29udGFpbiBIVE1MLCBpbiB3aGljaCBjYXNlIGl0J3MgREFOR0VST1VTTFkgcmVuZGVyZWRcbiAgc2luZ2xlQ29sb3I6IHByb3BUeXBlcy5ib29sLFxuICBjZW50ZXI6IHByb3BUeXBlcy5ib29sLFxufTtcblxuTG9hZGVyLmRlZmF1bHRQcm9wcyA9IHtcbiAgc2luZ2xlQ29sb3I6IHRydWUsXG4gIGNlbnRlcjogZmFsc2UsXG59O1xuIl19 */");

const Loader = function ({
  message,
  ...spinProps
}) {
  const spinner = (0, _jsxRuntime.jsx)(_extensions.Component.Spinner, { ...spinProps
  });
  const props = message && message.includes('<') ? {
    dangerouslySetInnerHTML: {
      __html: message
    }
  } : undefined;
  return message ? (0, _jsxRuntime.jsxs)(Wrapper, {
    children: [spinner, (0, _jsxRuntime.jsx)("p", { ...props,
      children: props ? undefined : message
    })]
  }) : spinner;
};

exports.Loader = Loader;
Loader.propTypes = {
  message: _propTypes.default.string,
  // can contain HTML, in which case it's DANGEROUSLY rendered
  singleColor: _propTypes.default.bool,
  center: _propTypes.default.bool
};
Loader.defaultProps = {
  singleColor: true,
  center: false
};