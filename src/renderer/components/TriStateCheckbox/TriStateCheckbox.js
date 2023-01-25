import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';

const { Icon } = Renderer.Component;

const CheckboxItem = styled.div(() => ({
  minWidth: 64,
  height: 'auto',
  display: 'flex',
  flexDirection: 'column',
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

const HelpText = styled.p(() => ({
  flex: 1, // flex child of <CheckboxItem>
  marginTop: layout.grid,
  fontStyle: 'italic',
  cursor: 'default',
}));

const iconStyles = {
  color: 'var(--inputControlBackground)',
  fontSize: '16px',
};

export const checkValues = {
  CHECKED: 'CHECKED',
  UNCHECKED: 'UNCHECKED',
  MIXED: 'MIXED',
};

export const TriStateCheckbox = ({
  label,
  help,
  onChange,
  value,
  ...props
}) => {
  return (
    <CheckboxItem {...props}>
      <CheckboxControlPart>
        <CheckboxControl isChecked={value !== checkValues.UNCHECKED}>
          {value === checkValues.MIXED && (
            <Icon material="remove" style={iconStyles} />
          )}
          {value === checkValues.CHECKED && (
            <Icon material="check" style={iconStyles} />
          )}
        </CheckboxControl>
        <CheckboxLabel>
          <CheckboxField
            type="checkbox"
            checked={value !== checkValues.UNCHECKED}
            onChange={onChange}
          />
          {label}
        </CheckboxLabel>
      </CheckboxControlPart>
      {help ? <HelpText>{help}</HelpText> : null}
    </CheckboxItem>
  );
};

TriStateCheckbox.propTypes = {
  label: PropTypes.string.isRequired,
  help: PropTypes.string, // help text, if any
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string.isRequired,
};
