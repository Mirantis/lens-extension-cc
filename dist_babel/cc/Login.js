"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Login = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _react = require("react");

var _propTypes = _interopRequireDefault(require("prop-types"));

var _extensions = require("@k8slens/extensions");

var _styles = require("./styles");

var _Section = require("./Section");

var strings = _interopRequireWildcard(require("../strings"));

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const urlClassName = 'lecc-Login--url';
const Field = (0, _base.default)("div", process.env.NODE_ENV === "production" ? {
  target: "el1pdab0"
} : {
  target: "el1pdab0",
  label: "Field"
})(function () {
  return {
    display: 'flex',
    alignItems: 'center',
    marginBottom: _styles.layout.gap,
    ':last-child': {
      marginBottom: 0
    },
    [`div.Input.${urlClassName}`]: {
      flex: 1
    },
    '> label': {
      minWidth: _styles.layout.grid * 23,
      marginRight: `${_styles.layout.pad}px`
    }
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9Mb2dpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFVYyIsImZpbGUiOiIuLi8uLi9zcmMvY2MvTG9naW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcbmltcG9ydCBzdHlsZWQgZnJvbSAnQGVtb3Rpb24vc3R5bGVkJztcbmltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gJ0BrOHNsZW5zL2V4dGVuc2lvbnMnO1xuaW1wb3J0IHsgbGF5b3V0IH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0IHsgU2VjdGlvbiB9IGZyb20gJy4vU2VjdGlvbic7XG5pbXBvcnQgKiBhcyBzdHJpbmdzIGZyb20gJy4uL3N0cmluZ3MnO1xuXG5jb25zdCB1cmxDbGFzc05hbWUgPSAnbGVjYy1Mb2dpbi0tdXJsJztcblxuY29uc3QgRmllbGQgPSBzdHlsZWQuZGl2KGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICBkaXNwbGF5OiAnZmxleCcsXG4gICAgYWxpZ25JdGVtczogJ2NlbnRlcicsXG4gICAgbWFyZ2luQm90dG9tOiBsYXlvdXQuZ2FwLFxuXG4gICAgJzpsYXN0LWNoaWxkJzoge1xuICAgICAgbWFyZ2luQm90dG9tOiAwLFxuICAgIH0sXG5cbiAgICBbYGRpdi5JbnB1dC4ke3VybENsYXNzTmFtZX1gXToge1xuICAgICAgZmxleDogMSxcbiAgICB9LFxuXG4gICAgJz4gbGFiZWwnOiB7XG4gICAgICBtaW5XaWR0aDogbGF5b3V0LmdyaWQgKiAyMyxcbiAgICAgIG1hcmdpblJpZ2h0OiBgJHtsYXlvdXQucGFkfXB4YCxcbiAgICB9LFxuICB9O1xufSk7XG5cbmV4cG9ydCBjb25zdCBMb2dpbiA9IGZ1bmN0aW9uICh7IGxvYWRpbmcsIGRpc2FibGVkLCBvbkxvZ2luLCAuLi5wcm9wcyB9KSB7XG4gIC8vXG4gIC8vIFNUQVRFXG4gIC8vXG5cbiAgY29uc3QgW2Nsb3VkVXJsLCBzZXRDbG91ZFVybF0gPSB1c2VTdGF0ZShwcm9wcy5jbG91ZFVybCB8fCAnJyk7XG4gIGNvbnN0IFt1c2VybmFtZSwgc2V0VXNlcm5hbWVdID0gdXNlU3RhdGUocHJvcHMudXNlcm5hbWUgfHwgJycpO1xuICBjb25zdCBbcGFzc3dvcmQsIHNldFBhc3N3b3JkXSA9IHVzZVN0YXRlKHByb3BzLnBhc3N3b3JkIHx8ICcnKTtcbiAgY29uc3QgW3ZhbGlkLCBzZXRWYWxpZF0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgLy9cbiAgLy8gRVZFTlRTXG4gIC8vXG5cbiAgY29uc3QgaGFuZGxlVXJsQ2hhbmdlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgc2V0Q2xvdWRVcmwodmFsdWUpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVVzZXJuYW1lQ2hhbmdlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgc2V0VXNlcm5hbWUodmFsdWUpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZVBhc3N3b3JkQ2hhbmdlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgc2V0UGFzc3dvcmQodmFsdWUpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUNsdXN0ZXJzQ2xpY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgb25Mb2dpbih7IGNsb3VkVXJsLCB1c2VybmFtZSwgcGFzc3dvcmQgfSk7XG4gIH07XG5cbiAgLy9cbiAgLy8gRUZGRUNUU1xuICAvL1xuXG4gIHVzZUVmZmVjdChcbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBzZXRWYWxpZCghIShjbG91ZFVybCAmJiB1c2VybmFtZSAmJiBwYXNzd29yZCkpO1xuICAgIH0sXG4gICAgW3VzZXJuYW1lLCBwYXNzd29yZCwgY2xvdWRVcmxdXG4gICk7XG5cbiAgLy9cbiAgLy8gUkVOREVSXG4gIC8vXG5cbiAgcmV0dXJuIChcbiAgICA8U2VjdGlvbiBjbGFzc05hbWU9XCJsZWNjLUxvZ2luXCI+XG4gICAgICA8aDM+e3N0cmluZ3MubG9naW4udGl0bGUoKX08L2gzPlxuICAgICAgPEZpZWxkPlxuICAgICAgICA8bGFiZWwgaHRtbEZvcj1cImxlY2MtbG9naW4tdXJsXCI+e3N0cmluZ3MubG9naW4udXJsLmxhYmVsKCl9PC9sYWJlbD5cbiAgICAgICAgPENvbXBvbmVudC5JbnB1dFxuICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICBjbGFzc05hbWU9e3VybENsYXNzTmFtZX1cbiAgICAgICAgICB0aGVtZT1cInJvdW5kLWJsYWNrXCIgLy8gYm9yZGVycyBvbiBhbGwgc2lkZXMsIHJvdW5kZWQgY29ybmVyc1xuICAgICAgICAgIGlkPVwibGVjYy1sb2dpbi11cmxcIlxuICAgICAgICAgIGRpc2FibGVkPXtsb2FkaW5nfVxuICAgICAgICAgIHZhbHVlPXtjbG91ZFVybH1cbiAgICAgICAgICBvbkNoYW5nZT17aGFuZGxlVXJsQ2hhbmdlfVxuICAgICAgICAvPlxuICAgICAgPC9GaWVsZD5cbiAgICAgIDxGaWVsZD5cbiAgICAgICAgPGxhYmVsIGh0bWxGb3I9XCJsZWNjLWxvZ2luLXVzZXJuYW1lXCI+XG4gICAgICAgICAge3N0cmluZ3MubG9naW4udXNlcm5hbWUubGFiZWwoKX1cbiAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgPENvbXBvbmVudC5JbnB1dFxuICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICB0aGVtZT1cInJvdW5kLWJsYWNrXCIgLy8gYm9yZGVycyBvbiBhbGwgc2lkZXMsIHJvdW5kZWQgY29ybmVyc1xuICAgICAgICAgIGlkPVwibGVjYy1sb2dpbi11c2VybmFtZVwiXG4gICAgICAgICAgZGlzYWJsZWQ9e2xvYWRpbmd9XG4gICAgICAgICAgdmFsdWU9e3VzZXJuYW1lfVxuICAgICAgICAgIG9uQ2hhbmdlPXtoYW5kbGVVc2VybmFtZUNoYW5nZX1cbiAgICAgICAgLz5cbiAgICAgIDwvRmllbGQ+XG4gICAgICA8RmllbGQ+XG4gICAgICAgIDxsYWJlbCBodG1sRm9yPVwibGVjYy1sb2dpbi1wYXNzd29yZFwiPlxuICAgICAgICAgIHtzdHJpbmdzLmxvZ2luLnBhc3N3b3JkLmxhYmVsKCl9XG4gICAgICAgIDwvbGFiZWw+XG4gICAgICAgIDxDb21wb25lbnQuSW5wdXRcbiAgICAgICAgICB0eXBlPVwicGFzc3dvcmRcIlxuICAgICAgICAgIHRoZW1lPVwicm91bmQtYmxhY2tcIiAvLyBib3JkZXJzIG9uIGFsbCBzaWRlcywgcm91bmRlZCBjb3JuZXJzXG4gICAgICAgICAgaWQ9XCJsZWNjLWxvZ2luLXBhc3N3b3JkXCJcbiAgICAgICAgICBkaXNhYmxlZD17bG9hZGluZ31cbiAgICAgICAgICB2YWx1ZT17cGFzc3dvcmR9XG4gICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZVBhc3N3b3JkQ2hhbmdlfVxuICAgICAgICAvPlxuICAgICAgPC9GaWVsZD5cbiAgICAgIDxkaXY+XG4gICAgICAgIDxDb21wb25lbnQuQnV0dG9uXG4gICAgICAgICAgcHJpbWFyeVxuICAgICAgICAgIGRpc2FibGVkPXtsb2FkaW5nIHx8IGRpc2FibGVkIHx8ICF2YWxpZH1cbiAgICAgICAgICBsYWJlbD17c3RyaW5ncy5sb2dpbi5hY3Rpb24ubGFiZWwoKX1cbiAgICAgICAgICB3YWl0aW5nPXtsb2FkaW5nfVxuICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZUNsdXN0ZXJzQ2xpY2t9XG4gICAgICAgIC8+XG4gICAgICA8L2Rpdj5cbiAgICA8L1NlY3Rpb24+XG4gICk7XG59O1xuXG5Mb2dpbi5wcm9wVHlwZXMgPSB7XG4gIG9uTG9naW46IHByb3BUeXBlcy5mdW5jLmlzUmVxdWlyZWQsXG4gIGxvYWRpbmc6IHByb3BUeXBlcy5ib29sLCAvLyBpZiBkYXRhIGZldGNoIHJlbGF0ZWQgdG8gbG9naW4gaXMgdGFraW5nIHBsYWNlXG4gIGRpc2FibGVkOiBwcm9wVHlwZXMuYm9vbCwgLy8gaWYgbG9naW4gc2hvdWxkIGJlIGRpc2FibGVkIGVudGlyZWx5XG4gIGNsb3VkVXJsOiBwcm9wVHlwZXMuc3RyaW5nLFxuICB1c2VybmFtZTogcHJvcFR5cGVzLnN0cmluZyxcbiAgcGFzc3dvcmQ6IHByb3BUeXBlcy5zdHJpbmcsXG59O1xuIl19 */");

const Login = function ({
  loading,
  disabled,
  onLogin,
  ...props
}) {
  //
  // STATE
  //
  const [cloudUrl, setCloudUrl] = (0, _react.useState)(props.cloudUrl || '');
  const [username, setUsername] = (0, _react.useState)(props.username || '');
  const [password, setPassword] = (0, _react.useState)(props.password || '');
  const [valid, setValid] = (0, _react.useState)(false); //
  // EVENTS
  //

  const handleUrlChange = function (value) {
    setCloudUrl(value);
  };

  const handleUsernameChange = function (value) {
    setUsername(value);
  };

  const handlePasswordChange = function (value) {
    setPassword(value);
  };

  const handleClustersClick = function () {
    onLogin({
      cloudUrl,
      username,
      password
    });
  }; //
  // EFFECTS
  //


  (0, _react.useEffect)(function () {
    setValid(!!(cloudUrl && username && password));
  }, [username, password, cloudUrl]); //
  // RENDER
  //

  return (0, _jsxRuntime.jsxs)(_Section.Section, {
    className: "lecc-Login",
    children: [(0, _jsxRuntime.jsx)("h3", {
      children: strings.login.title()
    }), (0, _jsxRuntime.jsxs)(Field, {
      children: [(0, _jsxRuntime.jsx)("label", {
        htmlFor: "lecc-login-url",
        children: strings.login.url.label()
      }), (0, _jsxRuntime.jsx)(_extensions.Component.Input, {
        type: "text",
        className: urlClassName,
        theme: "round-black" // borders on all sides, rounded corners
        ,
        id: "lecc-login-url",
        disabled: loading,
        value: cloudUrl,
        onChange: handleUrlChange
      })]
    }), (0, _jsxRuntime.jsxs)(Field, {
      children: [(0, _jsxRuntime.jsx)("label", {
        htmlFor: "lecc-login-username",
        children: strings.login.username.label()
      }), (0, _jsxRuntime.jsx)(_extensions.Component.Input, {
        type: "text",
        theme: "round-black" // borders on all sides, rounded corners
        ,
        id: "lecc-login-username",
        disabled: loading,
        value: username,
        onChange: handleUsernameChange
      })]
    }), (0, _jsxRuntime.jsxs)(Field, {
      children: [(0, _jsxRuntime.jsx)("label", {
        htmlFor: "lecc-login-password",
        children: strings.login.password.label()
      }), (0, _jsxRuntime.jsx)(_extensions.Component.Input, {
        type: "password",
        theme: "round-black" // borders on all sides, rounded corners
        ,
        id: "lecc-login-password",
        disabled: loading,
        value: password,
        onChange: handlePasswordChange
      })]
    }), (0, _jsxRuntime.jsx)("div", {
      children: (0, _jsxRuntime.jsx)(_extensions.Component.Button, {
        primary: true,
        disabled: loading || disabled || !valid,
        label: strings.login.action.label(),
        waiting: loading,
        onClick: handleClustersClick
      })
    })]
  });
};

exports.Login = Login;
Login.propTypes = {
  onLogin: _propTypes.default.func.isRequired,
  loading: _propTypes.default.bool,
  // if data fetch related to login is taking place
  disabled: _propTypes.default.bool,
  // if login should be disabled entirely
  cloudUrl: _propTypes.default.string,
  username: _propTypes.default.string,
  password: _propTypes.default.string
};