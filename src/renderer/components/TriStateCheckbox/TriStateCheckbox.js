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

export const TriStateCheckbox = ({ label, onChange, value }) => {
  return (
    <CheckboxItem>
      <CheckboxControlPart>
        <CheckboxControl isChecked={value !== 'UNCHECKED'}>
          {value === 'MIXED' && (
            <Component.Icon
              material="remove"
              style={{
                color: 'var(--inputControlBackground)',
                fontSize: 'calc(var(--font-size) * 1.14)',
              }}
            />
          )}
          {value === 'CHECKED' && (
            <Component.Icon
              material="check"
              style={{
                color: 'var(--inputControlBackground)',
                fontSize: 'calc(var(--font-size) * 1.14)',
              }}
            />
          )}
        </CheckboxControl>
        <CheckboxLabel>
          <CheckboxField
            type="checkbox"
            checked={value !== 'UNCHECKED'}
            onChange={() => onChange()}
          />
          {label}
        </CheckboxLabel>
      </CheckboxControlPart>
    </CheckboxItem>
  );
};

TriStateCheckbox.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func,
  isChecked: PropTypes.bool,
  isMinusIcon: PropTypes.bool,
  value: PropTypes.string,
};
