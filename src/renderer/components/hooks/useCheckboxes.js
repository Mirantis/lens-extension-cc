import { checkValues } from '../TriStateCheckbox/TriStateCheckbox';
import { useState } from 'react';

// set parent checkbox state based on changes of children checkboxes
const setParentCheckboxState = (children) => {
  const childrenCheckboxes = Object.values(children);

  if (
    childrenCheckboxes.every((el) => el === false) ||
    childrenCheckboxes.every((el) => el === true)
  ) {
    return childrenCheckboxes[0];
  }
  return childrenCheckboxes.some((el) => el === false);
};

/**
 * @param {ExtendedCloud} extCloud
 * @return {Object} {[namespaceName]: boolean}
 */
const makeCheckboxesStateObj = (extCloud) => {
  // if EC.namespaces aren't loaded yet, we use stored syncedNamespaces names from Cloud
  if (!extCloud.loaded) {
    return extCloud.cloud.allNamespaces.reduce((acc, name) => {
      acc[name] = extCloud.cloud.syncedNamespaces.includes(name);
      return acc;
    }, {});
  }
  // otherwise, we make state for all EC.namespaces, they have to be present
  // And use syncedNamespaces to make initial state checked for selected checkboxes
  return extCloud.namespaces.reduce((acc, namespace) => {
    acc[namespace.name] = extCloud.cloud.syncedNamespaces.includes(
      namespace.name
    );
    return acc;
  }, {});
};

/**
 * @param {ExtendedCloud} extCloud
 * @return {{parent: (boolean), children: Object}}
 */
export const makeCheckboxesInitialState = (extCloud) => {
  const children = makeCheckboxesStateObj(extCloud);
  return {
    parent: setParentCheckboxState(children),
    children,
  };
};

/**
 * @param {boolean} initialState.parent
 * @param {Object} initialState.children {[namespaceName]: boolean, ....} pairs
 */
export function useCheckboxes(initialState) {
  const [checkboxesState, setCheckboxesState] = useState(initialState);
  const getNewChildren = (newParentStatus) => {
    const newChildren = { ...checkboxesState.children };

    Object.keys(checkboxesState.children).forEach((name) => {
      newChildren[name] = newParentStatus;
    });
    return newChildren;
  };

  const getParentCheckboxValue = () => {
    const childrenCheckboxes = Object.values(checkboxesState.children);
    // if no children
    if (!childrenCheckboxes.length) {
      return checkValues.UNCHECKED;
    }

    if (
      checkboxesState.parent &&
      childrenCheckboxes.some((el) => el === false) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      return checkValues.MIXED;
    }
    if (checkboxesState.parent) {
      return checkValues.CHECKED;
    }
    return checkValues.UNCHECKED;
  };

  const getChildrenCheckboxValue = (name) => {
    return checkboxesState.children[name]
      ? checkValues.CHECKED
      : checkValues.UNCHECKED;
  };

  /**
   *
   * @param {string} [name] has to be present for children (optional for parent)
   * @param {boolean} [isParent] has to be true for parent.
   * @return {string} one of checkValues
   */
  const getCheckboxValue = ({ name, isParent }) =>
    isParent ? getParentCheckboxValue() : getChildrenCheckboxValue(name);

  /**
   * @param {string} [name] has to be present for children (optional for parent)
   * @param {boolean} [isParent] has to be true for parent.
   */
  const setCheckboxValue = ({ name, isParent }) => {
    if (isParent) {
      // if no children we can't check parent
      if (
        !Object.keys(checkboxesState.children).length &&
        !checkboxesState.parent
      ) {
        return;
      }
      setCheckboxesState({
        parent: !checkboxesState.parent,
        children: getNewChildren(!checkboxesState.parent),
      });
    } else {
      const newChildren = { ...checkboxesState.children };
      newChildren[name] = !checkboxesState.children[name];

      setCheckboxesState({
        children: newChildren,
        parent: setParentCheckboxState(newChildren),
      });
    }
  };

  const getSyncedData = () => {
    const ignoredNamespaces = [];
    const syncedNamespaces = [];
    Object.keys(checkboxesState.children).forEach((name) => {
      if (checkboxesState.children[name]) {
        syncedNamespaces.push(name);
      } else {
        ignoredNamespaces.push(name);
      }
    });
    return {
      syncedNamespaces,
      ignoredNamespaces,
    };
  };

  return {
    getCheckboxValue,
    setCheckboxValue,
    getSyncedData,
  };
}
