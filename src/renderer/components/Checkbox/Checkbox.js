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
  return (
    <CheckboxItem>
      <CheckboxControlPart>
        <CheckboxControl isChecked={isCheckedFromParent}>
          {isMinusIcon && isCheckedFromParent && (
            <Component.Icon
              material="remove"
              style={{
                color: 'rgb(23, 34, 47)',
                fontSize: 'calc(var(--font-size) * 1.14)',
              }}
            />
          )}
          {!isMinusIcon && isCheckedFromParent && (
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
            checked={isCheckedFromParent}
            onChange={() => onChange()}
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
