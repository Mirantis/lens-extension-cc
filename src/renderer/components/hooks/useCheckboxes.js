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
 *
 * @param {ExtendedCloud} extCloud
 * @param {Array<Namespace>?} syncedNamespaces
 * @return {Object} {[namespaceName]: boolean}
 */
const makeCheckboxesStateObj = (extCloud, syncedNamespaces) => {
  const syncedNamespacesNames = syncedNamespaces.map((sn) => sn.name);
  return (extCloud?.namespaces || []).reduce((acc, namespace) => {
    acc[namespace.name] = syncedNamespacesNames.includes(namespace.name);
    return acc;
  }, {});
};
/**
 *
 * @param {ExtendedCloud} extCloud
 * @param {Array<Namespace>?} syncedNamespaces
 * @return {{parent: (boolean), children: Object}}
 */
export const makeCheckboxesInitialState = (extCloud, syncedNamespaces = []) => {
  const children = makeCheckboxesStateObj(extCloud, syncedNamespaces);
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

  const getNewChildren = (parentCheckedStatus) => {
    const newChildren = { ...checkboxesState.children };

    Object.keys(checkboxesState.children).forEach((name) => {
      newChildren[name] = parentCheckedStatus;
    });
    return newChildren;
  };

  const getParentCheckboxValue = () => {
    const childrenCheckboxes = Object.values(checkboxesState.children);

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
   * @param {string?} name has to be present for children (optional for parent)
   * @param {boolean?} isParent has to be true for parent.
   * @return {string} one of checkValues
   */
  const getCheckboxValue = ({ name, isParent }) =>
    isParent ? getParentCheckboxValue() : getChildrenCheckboxValue(name);

  /**
   * @param {string?} name has to be present for children (optional for parent)
   * @param {boolean?} isParent has to be true for parent.
   */
  const setCheckboxValue = ({ name, isParent }) => {
    if (isParent) {
      setCheckboxesState({
        parent: !checkboxesState.parent,
        children: getNewChildren(!checkboxesState.parent, checkboxesState),
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
    if (getParentCheckboxValue() === checkValues.CHECKED) {
      return { syncAll: true, syncNamespaces: [] };
    }
    return {
      syncAll: false,
      syncNamespaces: Object.keys(checkboxesState.children).filter(
        (name) => checkboxesState.children[name]
      ),
    };
  };

  return {
    getCheckboxValue,
    setCheckboxValue,
    getSyncedData,
  };
}
