import { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';

const { Icon } = Renderer.Component;

const controlWidth = layout.grid * 4; // 16px
const controlLabelGap = layout.grid * 2.5; // 10px

const Wrapper = styled.div(() => ({
  minWidth: 64,
  height: 'auto',
  display: 'flex',
  flexDirection: 'column',
}));

const ControlPart = styled.div(() => ({
  height: 'auto',
  display: 'flex',
  alignItems: 'center',
}));

const Control = styled.div(({ isChecked }) => ({
  flex: '0 0 auto',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: controlWidth,
  height: controlWidth,
  borderWidth: 2,
  borderRadius: 2,
  borderStyle: 'solid',
  borderColor: isChecked ? 'var(--primary)' : 'var(--textColorSecondary)',
  backgroundColor: isChecked ? 'var(--primary)' : 'transparent',
  cursor: 'pointer',

  ':focus': {
    borderColor: 'var(--colorInfo)',
  },
}));

const HiddenField = styled.input(() => ({
  position: 'absolute',
  top: 'auto',
  left: 'auto',
  opacity: 0,
  width: 1,
  height: 1,
  display: 'none',
}));

const Label = styled.label(() => ({
  paddingLeft: controlLabelGap,
  cursor: 'pointer',
  overflowWrap: 'break-word',
  hyphens: 'auto',
  overflow: 'hidden',
}));

const HelpText = styled.p(() => ({
  flex: 1, // flex child of <CheckboxItem>
  marginTop: layout.grid,
  marginLeft: controlWidth + controlLabelGap,
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

//
// COMPONENT
//

const displayName = 'TriStateCheckbox';
const classPrefix = `cclex-${displayName.toLowerCase()}`;

/**
 * Toggle the value according to its type.
 * @param {string} value Current value to be toggled.
 * @returns {boolean} The new checked value, true or false.
 */
const toggleValue = function (value) {
  let newValue;

  if (value === checkValues.CHECKED) {
    newValue = checkValues.UNCHECKED;
  } else {
    // UNCHECKED || MIXED -> CHECKED
    newValue = checkValues.CHECKED;
  }

  return newValue === checkValues.CHECKED;
};

/**
 * Handle an event that should cause the value to be toggled.
 * @param {Event} event Trigger event.
 * @param {{ value: string, onChange: Function }} props Some component props.
 */
const handleToggleEvent = function (event, { value, onChange }) {
  const checked = toggleValue(value);

  if (typeof onChange === 'function') {
    onChange(event, {
      checked,
    });
  }
};

const noop = () => {};

export const TriStateCheckbox = ({
  disabled,
  label,
  help,
  name,
  required,
  tabIndex,
  value,
  onChange,
  ...otherProps
}) => {
  //
  // REFS
  //

  const ctrlRef = useRef(null); // {HTMLElement}

  //
  // EVENTS - MOUSE
  //

  const handleCtrlClick = useCallback(
    function (event) {
      if (!disabled) {
        handleToggleEvent(event, { value, onChange });
      }
    },
    [disabled, value, onChange]
  );

  const handleLabelClick = useCallback(
    function (event) {
      if (!disabled) {
        // NOTE: native HTML checkboxes fire their onClick event whether the user
        //  clicks on the box or the label, and clicking on the label sets focus
        //  to the related <input>, so we do the same here
        handleToggleEvent(event, { value, onChange });
        ctrlRef.current?.focus(); // focus the CTRL, not the hidden FIELD
      }
    },
    [disabled, value, onChange]
  );

  //
  // EVENTS - KEYBOARD
  //

  const handleCtrlKeyDown = useCallback(
    function (event) {
      if (!disabled) {
        if (event.key === 'Enter' || event.key === ' ') {
          // prevent unintentional form submits when pressing ENTER
          // prevent unintentional scrolling when pressing SPACEBAR
          event.preventDefault();

          handleToggleEvent(event, { value, onChange });
        }
      }
    },
    [disabled, value, onChange]
  );

  //
  // RENDER
  //

  const tab = disabled ? undefined : tabIndex ?? 0;

  return (
    <Wrapper {...otherProps} data-cclex-component={displayName}>
      <ControlPart>
        <Control
          className={`${classPrefix}-control`}
          role="checkbox"
          isChecked={value !== checkValues.UNCHECKED}
          tabIndex={tab}
          ref={ctrlRef}
          onClick={handleCtrlClick}
          onKeyDown={handleCtrlKeyDown}
        >
          <HiddenField
            className={`${classPrefix}-field`}
            type="checkbox"
            checked={value !== checkValues.UNCHECKED}
            aria-hidden="true" // make sure never part of a11y tree
            tabIndex={-1} // skip tab sequence
            disabled={disabled}
            required={required}
            name={name}
            onChange={noop}
          />
          {value === checkValues.MIXED && (
            <Icon material="remove" style={iconStyles} />
          )}
          {value === checkValues.CHECKED && (
            <Icon material="check" style={iconStyles} />
          )}
        </Control>
        <Label className={`${classPrefix}-label`} onClick={handleLabelClick}>
          {label}
        </Label>
      </ControlPart>
      {help ? (
        <HelpText className={`${classPrefix}-help`}>{help}</HelpText>
      ) : null}
    </Wrapper>
  );
};

TriStateCheckbox.displayName = displayName;
TriStateCheckbox.propTypes = {
  disabled: PropTypes.bool,
  label: PropTypes.string.isRequired,
  help: PropTypes.string, // help text, if any
  name: PropTypes.string,
  required: PropTypes.bool,
  tabIndex: PropTypes.number,
  value: PropTypes.oneOf(Object.values(checkValues)).isRequired, // STRING (not boolean) in order to set any of 3 states

  /**
   * Called when the checkbox is checked or unchecked. A checkbox that was MIXED
   *  will become checked.
   *
   * ⚠️ The event __will never be__ the `<input type="checkbox">` that serves as the
   *  underlying
   *
   * Signature: `(event: MouseEvent|KeyboardEvent, info: { checked: boolean }) => void`
   *
   * - `info.checked`: New checked state/value.
   */
  onChange: PropTypes.func.isRequired,
};
