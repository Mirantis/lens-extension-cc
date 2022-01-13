import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { CheckIcon } from './CheckIcon';
import { layout } from '../styles';

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
  border-color: ${({isChecked}) => isChecked ? 'var(--primary)' : 'var(--textColorSecondary)'};
  background-color: ${({isChecked}) => isChecked ? 'var(--primary)' : 'transparent'};
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

export const Checkbox = ({ label, handleChildCheckbox, isAllChecked }) => {

  // @type {boolean} states of checkbox
  const [isChecked, setIsChecked] = useState(false);

  // pass checkbox state to parent component
  // need to have handleChildCheckbox method in parent
  useEffect(() => {
    handleChildCheckbox && handleChildCheckbox(isChecked);
  }, [isChecked, handleChildCheckbox]);

  // control checkbox state from parent component
  useEffect(() => {
    setIsChecked(isAllChecked);
  }, [isAllChecked]);


  return (
    <CheckboxItem>
      <CheckboxControlPart>
        <CheckboxControl
          role="checkbox"
          aria-checked="false"
          aria-disabled="false"
          tabIndex="0"
          isChecked={isChecked}
        >
          {
            isChecked && <CheckIcon />
          }
        </CheckboxControl>
        <CheckboxLabel>
          <CheckboxField
            type="checkbox"
            aria-hidden="true"
            tabIndex="-1"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          {label}
        </CheckboxLabel>
      </CheckboxControlPart>
    </CheckboxItem>
  );
};

Checkbox.propTypes = {
  label: PropTypes.string,
  handleChildCheckbox: PropTypes.func,
  isAllChecked: PropTypes.bool,
};
