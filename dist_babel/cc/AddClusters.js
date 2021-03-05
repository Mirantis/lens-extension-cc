"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AddClusters = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _react = require("react");

var _propTypes = _interopRequireDefault(require("prop-types"));

var _extensions = require("@k8slens/extensions");

var _Cluster = require("./store/Cluster");

var _ClusterActionsProvider = require("./store/ClusterActionsProvider");

var _ExtStateProvider = require("./store/ExtStateProvider");

var _Section = require("./Section");

var _styles = require("./styles");

var strings = _interopRequireWildcard(require("../strings"));

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//
// Add Clusters Panel
//
const Section = ( /*#__PURE__*/0, _base.default)(_Section.Section, process.env.NODE_ENV === "production" ? {
  target: "e1gpq2j70"
} : {
  target: "e1gpq2j70",
  label: "Section"
})(function () {
  return {
    small: {
      marginTop: -(_styles.layout.gap - _styles.layout.grid)
    }
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9BZGRDbHVzdGVycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFlZ0IiLCJmaWxlIjoiLi4vLi4vc3JjL2NjL0FkZENsdXN0ZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy9cbi8vIEFkZCBDbHVzdGVycyBQYW5lbFxuLy9cblxuaW1wb3J0IHsgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgcHJvcFR5cGVzIGZyb20gJ3Byb3AtdHlwZXMnO1xuaW1wb3J0IHN0eWxlZCBmcm9tICdAZW1vdGlvbi9zdHlsZWQnO1xuaW1wb3J0IHsgQ29tcG9uZW50IH0gZnJvbSAnQGs4c2xlbnMvZXh0ZW5zaW9ucyc7XG5pbXBvcnQgeyBDbHVzdGVyIH0gZnJvbSAnLi9zdG9yZS9DbHVzdGVyJztcbmltcG9ydCB7IHVzZUNsdXN0ZXJBY3Rpb25zIH0gZnJvbSAnLi9zdG9yZS9DbHVzdGVyQWN0aW9uc1Byb3ZpZGVyJztcbmltcG9ydCB7IHVzZUV4dFN0YXRlIH0gZnJvbSAnLi9zdG9yZS9FeHRTdGF0ZVByb3ZpZGVyJztcbmltcG9ydCB7IFNlY3Rpb24gYXMgQmFzZVNlY3Rpb24gfSBmcm9tICcuL1NlY3Rpb24nO1xuaW1wb3J0IHsgbGF5b3V0IH0gZnJvbSAnLi9zdHlsZXMnO1xuaW1wb3J0ICogYXMgc3RyaW5ncyBmcm9tICcuLi9zdHJpbmdzJztcblxuY29uc3QgU2VjdGlvbiA9IHN0eWxlZChCYXNlU2VjdGlvbikoZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHNtYWxsOiB7XG4gICAgICBtYXJnaW5Ub3A6IC0obGF5b3V0LmdhcCAtIGxheW91dC5ncmlkKSxcbiAgICB9LFxuICB9O1xufSk7XG5cbmV4cG9ydCBjb25zdCBBZGRDbHVzdGVycyA9IGZ1bmN0aW9uICh7IG9uQWRkLCBjbHVzdGVycywgcGFzc3dvcmRSZXF1aXJlZCB9KSB7XG4gIC8vXG4gIC8vIFNUQVRFXG4gIC8vXG5cbiAgY29uc3Qge1xuICAgIHN0YXRlOiB7IGF1dGhBY2Nlc3MgfSxcbiAgfSA9IHVzZUV4dFN0YXRlKCk7XG5cbiAgY29uc3Qge1xuICAgIHN0YXRlOiB7IGxvYWRpbmc6IGFkZGluZ0NsdXN0ZXJzIH0sXG4gIH0gPSB1c2VDbHVzdGVyQWN0aW9ucygpO1xuXG4gIGNvbnN0IFtwYXNzd29yZCwgc2V0UGFzc3dvcmRdID0gdXNlU3RhdGUoJycpO1xuXG4gIC8vXG4gIC8vIEVWRU5UU1xuICAvL1xuXG4gIGNvbnN0IGhhbmRsZVBhc3N3b3JkQ2hhbmdlID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgc2V0UGFzc3dvcmQodmFsdWUpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUFkZENsaWNrID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2Ygb25BZGQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIG9uQWRkKHsgcGFzc3dvcmQ6IHBhc3N3b3JkUmVxdWlyZWQgPyBwYXNzd29yZCA6IG51bGwgfSk7XG4gICAgfVxuICB9O1xuXG4gIC8vXG4gIC8vIFJFTkRFUlxuICAvL1xuXG4gIHJldHVybiAoXG4gICAgPFNlY3Rpb24gY2xhc3NOYW1lPVwibGVjYy1BZGRDbHVzdGVyc1wiPlxuICAgICAgPGgzPntzdHJpbmdzLmFkZENsdXN0ZXJzLnRpdGxlKCl9PC9oMz5cblxuICAgICAgey8qIHJlcXVpcmVkIHdoZW4gcmVzcG9uZGluZyB0byBhbiBFWFRfRVZFTlRfQUREX0NMVVNURVJTIHdoZXJlIHdlIGdldCB0b2tlbnMgd2l0aG91dCBhIHBhc3N3b3JkICovfVxuICAgICAge3Bhc3N3b3JkUmVxdWlyZWQgJiYgKFxuICAgICAgICA8PlxuICAgICAgICAgIDxDb21wb25lbnQuSW5wdXRcbiAgICAgICAgICAgIHN0eWxlPXt7IHdpZHRoOiAyMDAgfX1cbiAgICAgICAgICAgIHR5cGU9XCJwYXNzd29yZFwiXG4gICAgICAgICAgICB0aGVtZT1cInJvdW5kLWJsYWNrXCIgLy8gYm9yZGVycyBvbiBhbGwgc2lkZXMsIHJvdW5kZWQgY29ybmVyc1xuICAgICAgICAgICAgZGlzYWJsZWQ9e2FkZGluZ0NsdXN0ZXJzfVxuICAgICAgICAgICAgdmFsdWU9e3Bhc3N3b3JkfVxuICAgICAgICAgICAgb25DaGFuZ2U9e2hhbmRsZVBhc3N3b3JkQ2hhbmdlfVxuICAgICAgICAgIC8+XG4gICAgICAgICAgPHNtYWxsIGNsYXNzTmFtZT1cImhpbnRcIj5cbiAgICAgICAgICAgIHtzdHJpbmdzLmFkZENsdXN0ZXJzLnBhc3N3b3JkLnRpcChhdXRoQWNjZXNzLnVzZXJuYW1lKX1cbiAgICAgICAgICA8L3NtYWxsPlxuICAgICAgICA8Lz5cbiAgICAgICl9XG5cbiAgICAgIDxkaXY+XG4gICAgICAgIDxDb21wb25lbnQuQnV0dG9uXG4gICAgICAgICAgcHJpbWFyeVxuICAgICAgICAgIGRpc2FibGVkPXtcbiAgICAgICAgICAgIGNsdXN0ZXJzLmxlbmd0aCA8PSAwIHx8XG4gICAgICAgICAgICBhZGRpbmdDbHVzdGVycyB8fFxuICAgICAgICAgICAgKHBhc3N3b3JkUmVxdWlyZWQgJiYgIXBhc3N3b3JkKVxuICAgICAgICAgIH1cbiAgICAgICAgICBsYWJlbD17c3RyaW5ncy5hZGRDbHVzdGVycy5hY3Rpb24ubGFiZWwoKX1cbiAgICAgICAgICB3YWl0aW5nPXthZGRpbmdDbHVzdGVyc31cbiAgICAgICAgICB0b29sdGlwPXtcbiAgICAgICAgICAgIGNsdXN0ZXJzLmxlbmd0aCA8PSAwXG4gICAgICAgICAgICAgID8gc3RyaW5ncy5hZGRDbHVzdGVycy5hY3Rpb24uZGlzYWJsZWRUaXAoKVxuICAgICAgICAgICAgICA6IHVuZGVmaW5lZFxuICAgICAgICAgIH1cbiAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVBZGRDbGlja31cbiAgICAgICAgLz5cbiAgICAgIDwvZGl2PlxuICAgIDwvU2VjdGlvbj5cbiAgKTtcbn07XG5cbkFkZENsdXN0ZXJzLnByb3BUeXBlcyA9IHtcbiAgY2x1c3RlcnM6IHByb3BUeXBlcy5hcnJheU9mKHByb3BUeXBlcy5pbnN0YW5jZU9mKENsdXN0ZXIpKSxcbiAgcGFzc3dvcmRSZXF1aXJlZDogcHJvcFR5cGVzLmJvb2wsXG5cbiAgLy8gKHsgcGFzc3dvcmQ6IHN0cmluZ3xudWxsIH0pID0+IHZvaWRcbiAgLy8gYHBhc3N3b3JkYCBpcyBudWxsIGlmIGBwYXNzd29yZFJlcXVpcmVkYCB3YXMgYGZhbHNlYCBhbmQgdGhlcmVmb3JlIGEgdmFsdWUgd2FzIG5vdCBjb2xsZWN0ZWRcbiAgLy8gIGZyb20gdGhlIHVzZXJcbiAgb25BZGQ6IHByb3BUeXBlcy5mdW5jLFxufTtcblxuQWRkQ2x1c3RlcnMuZGVmYXVsdFByb3BzID0ge1xuICBjbHVzdGVyczogW10sXG4gIHBhc3N3b3JkUmVxdWlyZWQ6IGZhbHNlLFxufTtcbiJdfQ== */");

const AddClusters = function ({
  onAdd,
  clusters,
  passwordRequired
}) {
  //
  // STATE
  //
  const {
    state: {
      authAccess
    }
  } = (0, _ExtStateProvider.useExtState)();
  const {
    state: {
      loading: addingClusters
    }
  } = (0, _ClusterActionsProvider.useClusterActions)();
  const [password, setPassword] = (0, _react.useState)(''); //
  // EVENTS
  //

  const handlePasswordChange = function (value) {
    setPassword(value);
  };

  const handleAddClick = function () {
    if (typeof onAdd === 'function') {
      onAdd({
        password: passwordRequired ? password : null
      });
    }
  }; //
  // RENDER
  //


  return (0, _jsxRuntime.jsxs)(Section, {
    className: "lecc-AddClusters",
    children: [(0, _jsxRuntime.jsx)("h3", {
      children: strings.addClusters.title()
    }), passwordRequired && (0, _jsxRuntime.jsxs)(_jsxRuntime.Fragment, {
      children: [(0, _jsxRuntime.jsx)(_extensions.Component.Input, {
        style: {
          width: 200
        },
        type: "password",
        theme: "round-black" // borders on all sides, rounded corners
        ,
        disabled: addingClusters,
        value: password,
        onChange: handlePasswordChange
      }), (0, _jsxRuntime.jsx)("small", {
        className: "hint",
        children: strings.addClusters.password.tip(authAccess.username)
      })]
    }), (0, _jsxRuntime.jsx)("div", {
      children: (0, _jsxRuntime.jsx)(_extensions.Component.Button, {
        primary: true,
        disabled: clusters.length <= 0 || addingClusters || passwordRequired && !password,
        label: strings.addClusters.action.label(),
        waiting: addingClusters,
        tooltip: clusters.length <= 0 ? strings.addClusters.action.disabledTip() : undefined,
        onClick: handleAddClick
      })
    })]
  });
};

exports.AddClusters = AddClusters;
AddClusters.propTypes = {
  clusters: _propTypes.default.arrayOf(_propTypes.default.instanceOf(_Cluster.Cluster)),
  passwordRequired: _propTypes.default.bool,
  // ({ password: string|null }) => void
  // `password` is null if `passwordRequired` was `false` and therefore a value was not collected
  //  from the user
  onAdd: _propTypes.default.func
};
AddClusters.defaultProps = {
  clusters: [],
  passwordRequired: false
};