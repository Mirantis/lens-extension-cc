"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ClusterList = void 0;

var _base = _interopRequireDefault(require("@emotion/styled/base"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _extensions = require("@k8slens/extensions");

var _ClusterActionsProvider = require("./store/ClusterActionsProvider");

var _Cluster = require("./store/Cluster");

var _Section = require("./Section");

var _styles = require("./styles");

var strings = _interopRequireWildcard(require("../strings"));

var _jsxRuntime = require("@emotion/react/jsx-runtime");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const CheckList = (0, _base.default)("div", process.env.NODE_ENV === "production" ? {
  target: "e12p4zxw0"
} : {
  target: "e12p4zxw0",
  label: "CheckList"
})(function () {
  return { ...(0, _styles.mixinFlexColumnGaps)(_styles.layout.pad),
    backgroundColor: 'var(--mainBackground)',
    padding: _styles.layout.pad,
    overflow: 'auto',
    borderRadius: _styles.layout.grid,
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'var(--borderColor)',
    boxShadow: '0 0 4px 0 inset var(--boxShadow)'
  };
}, process.env.NODE_ENV === "production" ? "" : "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jYy9DbHVzdGVyTGlzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFTa0IiLCJmaWxlIjoiLi4vLi4vc3JjL2NjL0NsdXN0ZXJMaXN0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHByb3BUeXBlcyBmcm9tICdwcm9wLXR5cGVzJztcbmltcG9ydCBzdHlsZWQgZnJvbSAnQGVtb3Rpb24vc3R5bGVkJztcbmltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gJ0BrOHNsZW5zL2V4dGVuc2lvbnMnO1xuaW1wb3J0IHsgdXNlQ2x1c3RlckFjdGlvbnMgfSBmcm9tICcuL3N0b3JlL0NsdXN0ZXJBY3Rpb25zUHJvdmlkZXInO1xuaW1wb3J0IHsgQ2x1c3RlciB9IGZyb20gJy4vc3RvcmUvQ2x1c3Rlcic7XG5pbXBvcnQgeyBTZWN0aW9uIH0gZnJvbSAnLi9TZWN0aW9uJztcbmltcG9ydCB7IGxheW91dCwgbWl4aW5GbGV4Q29sdW1uR2FwcyB9IGZyb20gJy4vc3R5bGVzJztcbmltcG9ydCAqIGFzIHN0cmluZ3MgZnJvbSAnLi4vc3RyaW5ncyc7XG5cbmNvbnN0IENoZWNrTGlzdCA9IHN0eWxlZC5kaXYoZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIC4uLm1peGluRmxleENvbHVtbkdhcHMobGF5b3V0LnBhZCksXG5cbiAgICBiYWNrZ3JvdW5kQ29sb3I6ICd2YXIoLS1tYWluQmFja2dyb3VuZCknLFxuICAgIHBhZGRpbmc6IGxheW91dC5wYWQsXG4gICAgb3ZlcmZsb3c6ICdhdXRvJyxcblxuICAgIGJvcmRlclJhZGl1czogbGF5b3V0LmdyaWQsXG4gICAgYm9yZGVyU3R5bGU6ICdzb2xpZCcsXG4gICAgYm9yZGVyV2lkdGg6IDEsXG4gICAgYm9yZGVyQ29sb3I6ICd2YXIoLS1ib3JkZXJDb2xvciknLFxuXG4gICAgYm94U2hhZG93OiAnMCAwIDRweCAwIGluc2V0IHZhcigtLWJveFNoYWRvdyknLFxuICB9O1xufSk7XG5cbmV4cG9ydCBjb25zdCBDbHVzdGVyTGlzdCA9IGZ1bmN0aW9uICh7XG4gIGNsdXN0ZXJzLFxuICBzZWxlY3RlZENsdXN0ZXJzLFxuICBvblNlbGVjdGlvbixcbiAgb25TZWxlY3RBbGwsXG59KSB7XG4gIC8vXG4gIC8vIFNUQVRFXG4gIC8vXG5cbiAgY29uc3Qge1xuICAgIHN0YXRlOiB7IGxvYWRpbmc6IGFkZGluZ0NsdXN0ZXJzIH0sXG4gIH0gPSB1c2VDbHVzdGVyQWN0aW9ucygpO1xuXG4gIC8vIG9ubHkgcmVhZHkgY2x1c3RlcnMgY2FuIGFjdHVhbGx5IGJlIHNlbGVjdGVkXG4gIGNvbnN0IHNlbGVjdGFibGVDbHVzdGVycyA9IGNsdXN0ZXJzLmZpbHRlcigoY2wpID0+IGNsLnJlYWR5KTtcblxuICAvL1xuICAvLyBFVkVOVFNcbiAgLy9cblxuICBjb25zdCBoYW5kbGVDbHVzdGVyU2VsZWN0ID0gZnVuY3Rpb24gKHNlbGVjdGVkLCBjbHVzdGVyKSB7XG4gICAgaWYgKHR5cGVvZiBvblNlbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgb25TZWxlY3Rpb24oeyBjbHVzdGVyLCBzZWxlY3RlZCB9KTtcbiAgICB9XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlU2VsZWN0QWxsTm9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIG9uU2VsZWN0QWxsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBvblNlbGVjdEFsbCh7XG4gICAgICAgIHNlbGVjdGVkOiBzZWxlY3RlZENsdXN0ZXJzLmxlbmd0aCA8IHNlbGVjdGFibGVDbHVzdGVycy5sZW5ndGgsXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLy9cbiAgLy8gUkVOREVSXG4gIC8vXG5cbiAgY29uc3QgaXNDbHVzdGVyU2VsZWN0ZWQgPSBmdW5jdGlvbiAoY2x1c3Rlcikge1xuICAgIHJldHVybiAhIXNlbGVjdGVkQ2x1c3RlcnMuZmluZCgoYykgPT4gYy5pZCA9PT0gY2x1c3Rlci5pZCk7XG4gIH07XG5cbiAgLy8gZmlyc3QgYnkgbmFtZXNwYWNlLCB0aGVuIGJ5IG5hbWVcbiAgY29uc3QgY29tcGFyZUNsdXN0ZXJzID0gZnVuY3Rpb24gKGxlZnQsIHJpZ2h0KSB7XG4gICAgY29uc3QgbnNDb21wYXJlID0gbGVmdC5uYW1lc3BhY2UubG9jYWxlQ29tcGFyZShyaWdodC5uYW1lc3BhY2UpO1xuICAgIGlmIChuc0NvbXBhcmUgIT09IDApIHtcbiAgICAgIHJldHVybiBuc0NvbXBhcmU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxlZnQubmFtZS5sb2NhbGVDb21wYXJlKHJpZ2h0Lm5hbWUpO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPFNlY3Rpb24gY2xhc3NOYW1lPVwibGVjYy1DbHVzdGVyTGlzdFwiPlxuICAgICAgPGgzPntzdHJpbmdzLmNsdXN0ZXJMaXN0LnRpdGxlKCl9PC9oMz5cbiAgICAgIDxDaGVja0xpc3Q+XG4gICAgICAgIHtjbHVzdGVycy5zb3J0KGNvbXBhcmVDbHVzdGVycykubWFwKChcbiAgICAgICAgICBjbHVzdGVyIC8vIGxpc3QgQUxMIGNsdXN0ZXJzXG4gICAgICAgICkgPT4gKFxuICAgICAgICAgIDxDb21wb25lbnQuQ2hlY2tib3hcbiAgICAgICAgICAgIGtleT17Y2x1c3Rlci5pZH1cbiAgICAgICAgICAgIGxhYmVsPXtgJHtjbHVzdGVyLm5hbWVzcGFjZX0gLyAke2NsdXN0ZXIubmFtZX0ke1xuICAgICAgICAgICAgICBjbHVzdGVyLnJlYWR5ID8gJycgOiBgICR7c3RyaW5ncy5jbHVzdGVyTGlzdC5ub3RSZWFkeSgpfWBcbiAgICAgICAgICAgIH1gfVxuICAgICAgICAgICAgZGlzYWJsZWQ9eyFjbHVzdGVyLnJlYWR5IHx8IGFkZGluZ0NsdXN0ZXJzfVxuICAgICAgICAgICAgdmFsdWU9e2lzQ2x1c3RlclNlbGVjdGVkKGNsdXN0ZXIpfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhjaGVja2VkKSA9PiBoYW5kbGVDbHVzdGVyU2VsZWN0KGNoZWNrZWQsIGNsdXN0ZXIpfVxuICAgICAgICAgIC8+XG4gICAgICAgICkpfVxuICAgICAgPC9DaGVja0xpc3Q+XG4gICAgICA8ZGl2PlxuICAgICAgICA8Q29tcG9uZW50LkJ1dHRvblxuICAgICAgICAgIHByaW1hcnlcbiAgICAgICAgICBkaXNhYmxlZD17c2VsZWN0YWJsZUNsdXN0ZXJzLmxlbmd0aCA8PSAwIHx8IGFkZGluZ0NsdXN0ZXJzfVxuICAgICAgICAgIGxhYmVsPXtcbiAgICAgICAgICAgIHNlbGVjdGVkQ2x1c3RlcnMubGVuZ3RoIDwgc2VsZWN0YWJsZUNsdXN0ZXJzLmxlbmd0aFxuICAgICAgICAgICAgICA/IHN0cmluZ3MuY2x1c3Rlckxpc3QuYWN0aW9uLnNlbGVjdEFsbC5sYWJlbCgpXG4gICAgICAgICAgICAgIDogc3RyaW5ncy5jbHVzdGVyTGlzdC5hY3Rpb24uc2VsZWN0Tm9uZS5sYWJlbCgpXG4gICAgICAgICAgfVxuICAgICAgICAgIG9uQ2xpY2s9e2hhbmRsZVNlbGVjdEFsbE5vbmV9XG4gICAgICAgIC8+XG4gICAgICA8L2Rpdj5cbiAgICA8L1NlY3Rpb24+XG4gICk7XG59O1xuXG5DbHVzdGVyTGlzdC5wcm9wVHlwZXMgPSB7XG4gIGNsdXN0ZXJzOiBwcm9wVHlwZXMuYXJyYXlPZihwcm9wVHlwZXMuaW5zdGFuY2VPZihDbHVzdGVyKSksIC8vIEFMTCBjbHVzdGVycywgZXZlbiBub24tcmVhZHkgb25lc1xuICBzZWxlY3RlZENsdXN0ZXJzOiBwcm9wVHlwZXMuYXJyYXlPZihwcm9wVHlwZXMuaW5zdGFuY2VPZihDbHVzdGVyKSksXG4gIG9uU2VsZWN0aW9uOiBwcm9wVHlwZXMuZnVuYywgLy8gKHsgY2x1c3RlcjogQ2x1c3Rlciwgc2VsZWN0ZWQ6IGJvb2xlYW4gfSkgPT4gdm9pZFxuICBvblNlbGVjdEFsbDogcHJvcFR5cGVzLmZ1bmMsIC8vICh7IHNlbGVjdGVkOiBib29sZWFuIH0pID0+IHZvaWRcbn07XG5cbkNsdXN0ZXJMaXN0LmRlZmF1bHRQcm9wcyA9IHtcbiAgY2x1c3RlcnM6IFtdLFxuICBzZWxlY3RlZENsdXN0ZXJzOiBbXSxcbn07XG4iXX0= */");

const ClusterList = function ({
  clusters,
  selectedClusters,
  onSelection,
  onSelectAll
}) {
  //
  // STATE
  //
  const {
    state: {
      loading: addingClusters
    }
  } = (0, _ClusterActionsProvider.useClusterActions)(); // only ready clusters can actually be selected

  const selectableClusters = clusters.filter(cl => cl.ready); //
  // EVENTS
  //

  const handleClusterSelect = function (selected, cluster) {
    if (typeof onSelection === 'function') {
      onSelection({
        cluster,
        selected
      });
    }
  };

  const handleSelectAllNone = function () {
    if (typeof onSelectAll === 'function') {
      onSelectAll({
        selected: selectedClusters.length < selectableClusters.length
      });
    }
  }; //
  // RENDER
  //


  const isClusterSelected = function (cluster) {
    return !!selectedClusters.find(c => c.id === cluster.id);
  }; // first by namespace, then by name


  const compareClusters = function (left, right) {
    const nsCompare = left.namespace.localeCompare(right.namespace);

    if (nsCompare !== 0) {
      return nsCompare;
    }

    return left.name.localeCompare(right.name);
  };

  return (0, _jsxRuntime.jsxs)(_Section.Section, {
    className: "lecc-ClusterList",
    children: [(0, _jsxRuntime.jsx)("h3", {
      children: strings.clusterList.title()
    }), (0, _jsxRuntime.jsx)(CheckList, {
      children: clusters.sort(compareClusters).map((cluster // list ALL clusters
      ) => (0, _jsxRuntime.jsx)(_extensions.Component.Checkbox, {
        label: `${cluster.namespace} / ${cluster.name}${cluster.ready ? '' : ` ${strings.clusterList.notReady()}`}`,
        disabled: !cluster.ready || addingClusters,
        value: isClusterSelected(cluster),
        onChange: checked => handleClusterSelect(checked, cluster)
      }, cluster.id))
    }), (0, _jsxRuntime.jsx)("div", {
      children: (0, _jsxRuntime.jsx)(_extensions.Component.Button, {
        primary: true,
        disabled: selectableClusters.length <= 0 || addingClusters,
        label: selectedClusters.length < selectableClusters.length ? strings.clusterList.action.selectAll.label() : strings.clusterList.action.selectNone.label(),
        onClick: handleSelectAllNone
      })
    })]
  });
};

exports.ClusterList = ClusterList;
ClusterList.propTypes = {
  clusters: _propTypes.default.arrayOf(_propTypes.default.instanceOf(_Cluster.Cluster)),
  // ALL clusters, even non-ready ones
  selectedClusters: _propTypes.default.arrayOf(_propTypes.default.instanceOf(_Cluster.Cluster)),
  onSelection: _propTypes.default.func,
  // ({ cluster: Cluster, selected: boolean }) => void
  onSelectAll: _propTypes.default.func // ({ selected: boolean }) => void

};
ClusterList.defaultProps = {
  clusters: [],
  selectedClusters: []
};