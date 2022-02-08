import { checkValues } from '../TriStateCheckbox/TriStateCheckbox';
import { useState } from 'react';

const makeCheckboxesStateObj = (extCloud) => {
  return (extCloud?.namespaces || []).reduce((acc, namespace) => {
    acc[namespace.name] = false;
    return acc;
  }, {});
};
export const makeCheckboxesInitialState = (extCloud) => {
  return {
    parent: false,
    children: makeCheckboxesStateObj(extCloud),
  };
};

/**
 * @param {boolean} initialState.parent
 * @param {Object} initialState.children {[key]: boolean, ....} pairs. Mainly it's result of makeCheckboxesStateObj
 */
export function useCheckboxes(initialState) {
  const [checkboxesState, setCheckboxesState] = useState(initialState);

  // set parent checkbox state based on changes of children checkboxes
  const setParentCheckboxState = (children) => {
    const childrenCheckboxes = Object.values(children);

    if (
      childrenCheckboxes.every((el) => el === false) ||
      childrenCheckboxes.every((el) => el === true)
    ) {
      return childrenCheckboxes[0];
    }
    if (childrenCheckboxes.some((el) => el === false)) {
      return true;
    }
    return checkboxesState.parent;
  };

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
    } else {
      return checkValues.UNCHECKED;
    }
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
        parent: setParentCheckboxState(newChildren, checkboxesState),
      });
    }
  };

  return {
    getCheckboxValue,
    setCheckboxValue,
  };
}
