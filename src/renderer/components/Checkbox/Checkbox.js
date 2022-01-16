import { useState } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';

const { Component } = Renderer;

const CheckboxItem = styled.div(() => ({
  minWidth: 64,
  height: 'auto',
  display: 'flex',
}));

const CheckboxControlPart = styled.label(() => ({
  height: 'auto',
  display: 'flex',
  alignItems: 'center',
}));

const CheckboxControl = styled.div`
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 16px;
  height: 16px;
  border-width: 2px;
  border-radius: 2px;
  border-style: solid;
  border-color: ${({ isChecked }) =>
    isChecked ? 'var(--primary)' : 'var(--textColorSecondary)'};
  background-color: ${({ isChecked }) =>
    isChecked ? 'var(--primary)' : 'transparent'};
  cursor: pointer;
`;

const CheckboxField = styled.input(() => ({
  position: 'absolute',
  top: 'auto',
  left: 'auto',
  opacity: 0,
  width: 1,
  height: 1,
  display: 'none',
}));

const CheckboxLabel = styled.span(() => ({
  marginLeft: layout.grid * 2.5,
  cursor: 'pointer',
  overflowWrap: 'break-word',
  hyphens: 'auto',
  overflow: 'hidden',
}));

export const Checkbox = ({
  label,
  onChange,
  isCheckedFromParent,
  isMinusIcon,
}) => {
  // @type {boolean} states of checkbox
  const [isChecked, setIsChecked] = useState(false);

  const isCheckboxControlled = typeof isCheckedFromParent === 'boolean';
  const customIsChecked = isCheckboxControlled
    ? isCheckedFromParent
    : isChecked;

  const handleOnChange = () => {
    return isCheckboxControlled ? onChange() : setIsChecked(!isChecked);
  };

  return (
    <CheckboxItem>
      <CheckboxControlPart>
        <CheckboxControl
          role="checkbox"
          aria-checked="false"
          aria-disabled="false"
          tabIndex="0"
          isChecked={customIsChecked}
        >
          {isMinusIcon && customIsChecked && (
            <Component.Icon
              material="remove"
              style={{
                color: 'rgb(23, 34, 47)',
                fontSize: 'calc(var(--font-size) * 1.14)',
              }}
            />
          )}
          {!isMinusIcon && customIsChecked && (
            <Component.Icon
              material="check"
              style={{
                color: 'rgb(23, 34, 47)',
                fontSize: 'calc(var(--font-size) * 1.14)',
              }}
            />
          )}
        </CheckboxControl>
        <CheckboxLabel>
          <CheckboxField
            type="checkbox"
            aria-hidden="true"
            tabIndex="-1"
            checked={customIsChecked}
            onChange={() => handleOnChange()}
          />
          {label}
        </CheckboxLabel>
      </CheckboxControlPart>
    </CheckboxItem>
  );
};

Checkbox.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func,
  isCheckedFromParent: PropTypes.bool,
  isMinusIcon: PropTypes.bool,
};
