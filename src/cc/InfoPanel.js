//
// Info Message
//

import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Component } from '@k8slens/extensions';
import { layout } from './styles';

const Info = styled.p(function () {
  return {
    marginTop: 2, // to center with icon
    marginLeft: layout.pad,
  };
});

const Panel = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'flex-start', // make sure all content visible if needs scrolling
    backgroundColor: 'var(--colorInfo)',
    borderColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: layout.grid,
    color: 'white',
    padding: layout.pad,
    maxHeight: 100,
    overflow: 'auto',
  };
});

export const InfoPanel = function ({ children }) {
  return (
    <Panel>
      <Component.Icon material="info_outline" />
      <Info>{children}</Info>
    </Panel>
  );
};

InfoPanel.propTypes = {
  // zero or more child nodes
  children: propTypes.oneOfType([
    propTypes.arrayOf(propTypes.node),
    propTypes.node,
  ]),
};
