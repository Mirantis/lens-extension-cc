import { useMemo, useCallback } from 'react';
import { Renderer } from '@k8slens/extensions';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import * as rtv from 'rtvjs';
import { layout } from '../styles';
import * as strings from '../../../strings';

const {
  Component: { Icon, Button, Dialog },
} = Renderer;

//
// STYLED COMPONENTS
//

const framePadding = layout.gap;

const StyledHeader = styled.header(() => ({
  // flex child of `StyledFrame`
  flex: 'none',

  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',

  width: '100%',
  paddingBottom: layout.gap,

  cursor: 'default',

  h3: {
    color: 'var(--textColorAccent)',
    fontWeight: 'bold',
  },
}));

const StyledBody = styled.div(() => ({
  // flex child of `StyledFrame`
  flex: 1,

  display: 'flex',
  flexDirection: 'column',

  width: '100%',

  overflow: 'auto',
}));

const StyledFooter = styled.footer(() => ({
  // flex child of `StyledFrame`
  flex: 'none',

  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',

  width: '100%',
  paddingTop: layout.gap,

  '> button': {
    marginRight: layout.gap,
  },
  '> button:last-of-type': {
    marginRight: 0,
  },
}));

const StyledFrame = styled.div(() => ({
  // flex child of `StyledDialog.box`
  flex: 1,

  display: 'flex',
  flexDirection: 'column',

  width: '100%',
  margin: 0,
  padding: framePadding,
}));

const StyledDialog = styled(Dialog)(() => ({
  '> .box': {
    display: 'flex',
    flexDirection: 'column',

    minWidth: 45 * layout.grid,
    maxWidth: '50vw',
    minHeight: 200,
    maxHeight: '85vh',

    backgroundColor: 'var(--secondaryBackground)',
  },
}));

//
// MODAL
//

const displayName = 'Modal';
const classPrefix = `cclex-${displayName.toLowerCase()}`;

export const Modal = function ({
  callAction,
  cancelAction,
  className,
  children,
  title,

  onClose,

  ...otherProps
}) {
  //
  // PROPS
  //

  //
  // VERIFY
  //

  if (DEV_ENV) {
    // PERFORMANCE: only verify props when they change
    // eslint-disable-next-line react-hooks/rules-of-hooks -- DEV_ENV never changes at runtime
    useMemo(
      function () {
        // assert some required props in Dev builds (in part because prop-types
        //  considers an empty string as valid for a required string prop)
        DEV_ENV &&
          rtv.verify(
            { props: { title } },
            {
              props: {
                title: rtv.STRING,
              },
            }
          );
      },
      [title]
    );
  }

  //
  // EVENTS
  //

  const handleDialogClose = useCallback(
    function () {
      if (typeof onClose === 'function') {
        onClose();
      }
    },
    [onClose]
  );

  const handleCloseClick = useCallback(
    function () {
      if (typeof onClose === 'function') {
        onClose();
      }
    },
    [onClose]
  );

  const handleCallClick = useCallback(
    function (event) {
      const { onClick } = callAction || {};
      if (typeof onClick === 'function') {
        onClick(event);
      }
    },
    [callAction]
  );

  const handleCancelClick = useCallback(
    function (event) {
      const { onClick } = cancelAction || {};
      if (typeof onClick === 'function') {
        onClick(event);
      }
    },
    [cancelAction]
  );

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  return (
    <StyledDialog
      className={className}
      // NOTE: <Dialog> doesn't support `style` prop
      data-cclex-component={displayName}
      isOpen
      onClose={handleDialogClose}
    >
      <StyledFrame
        {...otherProps}
        // AFTER other props as not overrideable or picked earlier
        className={`${classPrefix}-frame`}
      >
        <StyledHeader className={`${classPrefix}-header`}>
          <h3>{title}</h3>
          <Icon
            material="close"
            interactive
            focusable
            onClick={handleCloseClick}
          />
        </StyledHeader>
        <StyledBody className={`${classPrefix}-body`}>{children}</StyledBody>
        <StyledFooter className={`${classPrefix}-footer`}>
          {cancelAction ? (
            <Button
              secondary
              label={cancelAction.label || strings.modal.defaultCancelLabel()}
              onClick={handleCancelClick}
              disabled={cancelAction.disabled}
            />
          ) : null}
          <Button
            primary
            label={callAction?.label || strings.modal.defaultCallLabel()}
            onClick={handleCallClick}
            disabled={callAction?.disabled}
          />
        </StyledFooter>
      </StyledFrame>
    </StyledDialog>
  );
};

Modal.displayName = displayName;
Modal.propTypes = {
  // other props are applied to the FRAME (inside the Lens DIALOG)

  // primary call to action
  callAction: propTypes.shape({
    disabled: propTypes.bool,
    label: propTypes.string, // defaults to 'OK' if not specified

    // Signature: `(event: MouseEvent|KeyboardEvent) => void`
    onClick: propTypes.func,
  }),

  // optional secondary cancel action
  cancelAction: propTypes.shape({
    disabled: propTypes.bool,
    label: propTypes.string, // defaults to 'Cancel' if not specified

    // Signature: `(event: MouseEvent|KeyboardEvent) => void`
    onClick: propTypes.func,
  }),

  // children are placed in the BODY
  children: propTypes.oneOfType([
    propTypes.node,
    propTypes.arrayOf(propTypes.node),
  ]),
  className: propTypes.string, // applied to the DIALOG
  title: propTypes.string.isRequired,

  //// EVENTS

  // Modal is closed by either clicking outside or pressing ESC key.
  //
  // Signature: `() => void`
  onClose: propTypes.func,
};
