import styled from '@emotion/styled';
import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import { layout, mixinPageStyles } from '../styles';
import { ContainerCloudIcon } from '../ContainerCloudIcon';
import * as strings from '../../../strings';
import * as constants from '../../../constants';

const { Component } = Renderer;

//
// INTERNAL STYLED COMPONENTS
//

const WelcomeContainer = styled.div(function () {
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    fontSize: '1.45em',
    lineHeight: '1.25',
    zIndex: 10,
    ...mixinPageStyles(),
  };
});

const WelcomeWrapper = styled.div(function () {
  return {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--layoutBackground)',
  };
});

const WelcomeInner = styled.div(function () {
  return {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    maxWidth: layout.grid * 180,
    width: '100%',
    backgroundColor: 'var(--layoutBackground)',
  };
});

const WelcomeIconWrapper = styled.div(function () {
  return {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: layout.grid * 6,
  };
});

const WelcomeTitle = styled.h1(function () {
  return {
    fontSize: '1.5em',
    textAlign: 'center',
    width: '100%',
    marginBottom: layout.grid * 6,
  };
});

const WelcomeDescription = styled.p(function () {
  return {
    width: '100%',
    marginBottom: layout.grid * 9,
  };
});

const WelcomeList = styled.ul(function () {
  return {
    width: '100%',
    marginBottom: layout.grid * 5,

    'li:not(:last-of-type)': {
      marginBottom: layout.grid * 4,
    },

    'li::before': {
      content: '"-"',
      marginRight: layout.grid,
    },
  };
});

const WelcomeLink = styled.a(function () {
  return {
    width: '100%',
    textDecoration: 'none',
    color: 'var(--primary)',
  };
});

const WelcomeButtonWrapper = styled.div(function () {
  return {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: layout.grid * 12,
  };
});

export const WelcomeView = ({ openAddCloud }) => (
  <WelcomeContainer>
    <WelcomeWrapper>
      <WelcomeInner>
        <WelcomeIconWrapper>
          <ContainerCloudIcon size={80} fill="var(--textColorAccent)" />
        </WelcomeIconWrapper>
        <WelcomeTitle
          dangerouslySetInnerHTML={{
            __html: strings.welcome.titleHtml(),
          }}
        />
        <WelcomeDescription>{strings.welcome.description()}</WelcomeDescription>
        <WelcomeList
          dangerouslySetInnerHTML={{
            __html: strings.welcome.listItemsHtml(),
          }}
        />
        <WelcomeLink href={constants.repository.readmeUrl} target="_blank">
          {strings.welcome.link.label()}
        </WelcomeLink>
        <WelcomeButtonWrapper>
          <Component.Button
            primary
            label={strings.welcome.button.label()}
            onClick={openAddCloud}
          />
        </WelcomeButtonWrapper>
      </WelcomeInner>
    </WelcomeWrapper>
  </WelcomeContainer>
);

WelcomeView.propTypes = {
  openAddCloud: PropTypes.func.isRequired,
};
