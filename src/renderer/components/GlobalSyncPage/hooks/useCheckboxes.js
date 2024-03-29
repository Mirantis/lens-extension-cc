import { checkValues } from '../../TriStateCheckbox/TriStateCheckbox';
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
 * @param {DataCloud} dataCloud
 * @return {Object} {[namespaceName]: boolean}
 */
const makeCheckboxesStateObj = (dataCloud) => {
  return dataCloud.namespaces.reduce((acc, namespace) => {
    acc[namespace.name] = namespace.synced;
    return acc;
  }, {});
};

/**
 * @param {DataCloud} dataCloud
 * @return {{parent: (boolean), children: Object}}
 */
export const makeCheckboxesInitialState = (dataCloud) => {
  const children = makeCheckboxesStateObj(dataCloud);
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
      (childrenCheckboxes.some((el) => el === false) ||
        childrenCheckboxes.some((el) => el === undefined)) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      return checkValues.MIXED;
    }
    if (
      checkboxesState.parent &&
      childrenCheckboxes.every((el) => el === true)
    ) {
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

      const isSomeChildrenChecked =
        Object.values(checkboxesState.children).some((el) => el === false) &&
        Object.values(checkboxesState.children).some((el) => el === true);
      const parentValue = isSomeChildrenChecked
        ? true
        : !checkboxesState.parent;

      setCheckboxesState({
        parent: parentValue,
        children: getNewChildren(parentValue),
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
