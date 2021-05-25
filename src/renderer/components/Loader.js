//
// A Lens Spinner with a message.
//

import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { layout } from './styles';

const { Component } = Renderer;

const Wrapper = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'center',

    p: {
      marginLeft: layout.pad,
    },
  };
});

export const Loader = function ({ message, ...spinProps }) {
  const spinner = <Component.Spinner {...spinProps} />;
  const props =
    message && message.includes('<')
      ? { dangerouslySetInnerHTML: { __html: message } }
      : undefined;

  return message ? (
    <Wrapper>
      {spinner}
      <p {...props}>{props ? undefined : message}</p>
    </Wrapper>
  ) : (
    spinner
  );
};

Loader.propTypes = {
  message: propTypes.string, // can contain HTML, in which case it's DANGEROUSLY rendered
  singleColor: propTypes.bool,
  center: propTypes.bool,
};

Loader.defaultProps = {
  singleColor: true,
  center: false,
};
