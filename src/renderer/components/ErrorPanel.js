//
// Error Message
//

import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { layout } from './styles';

const Error = styled.p(function () {
  return {
    marginTop: 2, // to center with icon
    marginLeft: layout.pad,
  };
});

const Panel = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'flex-start', // make sure all content visible if needs scrolling
    backgroundColor: 'var(--colorError)',
    borderColor: 'var(--colorSoftError)',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: layout.grid,
    color: 'white',
    padding: layout.pad,
    maxHeight: 100,
    overflow: 'auto',
  };
});

export const ErrorPanel = function ({ children }) {
  return (
    <Panel>
      <Component.Icon material="error_outline" />
      <Error>{children}</Error>
    </Panel>
  );
};

ErrorPanel.propTypes = {
  // zero or more child nodes
  children: propTypes.oneOfType([
    propTypes.arrayOf(propTypes.node),
    propTypes.node,
  ]),
};
