import { checkValues } from '../TriStateCheckbox/TriStateCheckbox';
import React, { useState } from 'react';
import PropTypes from 'prop-types';


const checkboxesStateObj = (extCloud) => {
  return (extCloud?.namespaces || []).reduce((acc, namespace) => {
    acc[namespace.name] = false;
    return acc;
  }, {});
};

export const HOCWithCheckboxes = ({Component}) => {
  const { extendedCloud } = Component.props
  const [checkboxesState, setCheckboxesState] = useState({
    parent: false,
    children: checkboxesStateObj(extendedCloud),
  });

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

  const checkBoxChangeHandler = (name) => {
    if (!name) {
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

  const childrenCheckboxValue = (name) => {
    return checkboxesState.children[name]
      ? checkValues.CHECKED
      : checkValues.UNCHECKED;
  };

  return React.cloneElement(Component, {
    ...Component.props,
    checkBoxChangeHandler,
    parentCheckboxValue: getParentCheckboxValue(),
    childrenCheckboxValue,
    withCheckboxes: true,
  });
}

HOCWithCheckboxes.propTypes = {
  Component: PropTypes.node.isRequired,
}