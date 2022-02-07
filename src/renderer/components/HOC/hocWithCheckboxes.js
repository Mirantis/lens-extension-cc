import { checkValues } from '../TriStateCheckbox/TriStateCheckbox';

export const hocWithCheckboxes = (Component, extraProps={}) => {
  const checkboxesStateObj = (extCloud) => {
    return (extCloud?.namespaces || []).reduce((acc, namespace) => {
      acc[namespace.name] = false;
      return acc;
    }, {});
  };

  // set parent checkbox state based on changes of children checkboxes
  const setParentCheckboxState = (children, сheckboxesState) => {
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
    return сheckboxesState.parent;
  };

  const getNewChildren = (parentCheckedStatus, сheckboxesState) => {
    const newChildren = { ...сheckboxesState.children };

    Object.keys(сheckboxesState.children).forEach((name) => {
      newChildren[name] = parentCheckedStatus;
    });
    return newChildren;
  };

  const onChangeHandler = (name, сheckboxesState, setCheckboxesState) => {
    if (!name) {
      setCheckboxesState({
        parent: !сheckboxesState.parent,
        children: getNewChildren(!сheckboxesState.parent, сheckboxesState),
      });
    } else {
      const newChildren = { ...сheckboxesState.children };
      newChildren[name] = !сheckboxesState.children[name];

      setCheckboxesState({
        children: newChildren,
        parent: setParentCheckboxState(newChildren, сheckboxesState),
      });
    }
  };

  const parentCheckboxValue = (сheckboxesState) => {
    const childrenCheckboxes = Object.values(сheckboxesState.children);

    if (
      сheckboxesState.parent &&
      childrenCheckboxes.some((el) => el === false) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      return checkValues.MIXED;
    }
    if (сheckboxesState.parent) {
      return checkValues.CHECKED;
    } else {
      return checkValues.UNCHECKED;
    }
  };

  const childrenCheckboxValue = (name, сheckboxesState) => {
    return сheckboxesState.children[name]
      ? checkValues.CHECKED
      : checkValues.UNCHECKED;
  };

  return (
    <Component
      {...Component.props}
      {...extraProps}
      checkboxesStateObj={checkboxesStateObj}
      onChangeHandler={onChangeHandler}
      parentCheckboxValue={parentCheckboxValue}
      childrenCheckboxValue={childrenCheckboxValue}
    />
  );
}
