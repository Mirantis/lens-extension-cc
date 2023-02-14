//
// Inline notice message (i.e. only the icon has color, no background)
//

import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from './styles';

const { Component } = Renderer;

// notice types enumeration, maps to Material icon
export const types = Object.freeze({
  NOTE: 'announcement', // or 'description' could work too
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'check_circle',
});

// icon size enumeration
export const iconSizes = Object.freeze({
  NORMAL: 'NORMAL', // matched to normal <p> text
  SMALL: 'SMALL', // good for use with <small>
});

const Notice = styled.div(function ({ iconSize }) {
  return {
    marginTop: iconSize === iconSizes.SMALL ? 0 : 2, // to center with icon
    marginLeft: layout.grid,
  };
});

const Container = styled.div(function () {
  return {
    display: 'flex',

    '> .Icon': {
      marginTop: layout.grid / 2,
    },
  };
});

const displayName = 'InlineNotice';

export const InlineNotice = function ({
  type,
  iconSize,
  children,
  ...otherProps
}) {
  let color;
  switch (type) {
    case types.NOTE:
      color = 'var(--textColorPrimary)';
      break;
    case types.INFO:
      color = 'var(--colorInfo)';
      break;
    case types.WARNING:
      color = 'var(--colorWarning)';
      break;
    case types.ERROR:
      color = 'var(--colorError)';
      break;
    case types.SUCCESS:
      color = 'var(--colorSuccess)';
      break;
    default:
      color = 'var(--colorVague)';
      break;
  }

  return (
    <Container
      {...otherProps}
      // AFTER other props as picked earlier or not overrideable
      data-cclex-component={displayName}
      type={type}
    >
      <Component.Icon
        material={type}
        smallest={iconSize === iconSizes.SMALL}
        focusable={false}
        interactive={false}
        style={{ color }}
      />
      <Notice iconSize={iconSize}>{children}</Notice>
    </Container>
  );
};

InlineNotice.displayName = displayName;
InlineNotice.propTypes = {
  iconSize: propTypes.oneOf(Object.values(iconSizes)),
  type: propTypes.oneOf(Object.values(types)),

  // zero or more child nodes
  children: propTypes.oneOfType([
    propTypes.arrayOf(propTypes.node),
    propTypes.node,
  ]),
};
InlineNotice.defaultProps = {
  iconSize: iconSizes.NORMAL,
  type: types.INFO,
};
