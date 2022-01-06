//
// Main view for the WelcomePage
//

import styled from '@emotion/styled';
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
    fontSize: 'calc(var(--font-size) * 1.7)',
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
    alignItems: 'flex-start',
    maxWidth: layout.grid * 180,
    width: '100%',
    backgroundColor: 'var(--layoutBackground)',
  };
});

const WelcomeIconWrapper = styled.div(function () {
  return {
    width: '100%',
    textAlign: 'center',
    paddingTop: layout.grid * 8,
    marginBottom: layout.grid * 6,
  };
});

const WelcomeTitle = styled.h1(function () {
  return {
    fontSize: 'calc(var(--font-size) * 2.6)',
    lineHeight: '1.11',
    textAlign: 'center',
    marginBottom: layout.grid * 6,
  };
});

const WelcomeDescription = styled.p(function () {
  return {
    marginBottom: layout.grid * 9,
  };
});

const WelcomeList = styled.ul(function () {
  return {
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
    textDecoration: 'none',
    color: 'var(--primary)',
  };
});

const WelcomeButtonWrapper = styled.div(function () {
  return {
    width: '100%',
    textAlign: 'center',
    marginTop: layout.grid * 12,
  };
});

//
// MAIN COMPONENT
//

export const WelcomeView = function () {
  //
  // RENDER
  //

  return (
    <WelcomeContainer>
      <WelcomeWrapper>
        <WelcomeInner>
          <WelcomeIconWrapper>
            <ContainerCloudIcon size={100} fill="var(--textColorAccent)" />
          </WelcomeIconWrapper>
          <WelcomeTitle
            dangerouslySetInnerHTML={{
              __html: strings.welcome.titleHtml(),
            }}
          />
          <WelcomeDescription>
            {strings.welcome.description()}
          </WelcomeDescription>
          <WelcomeList
            dangerouslySetInnerHTML={{
              __html: strings.welcome.listItemsHtml(),
            }}
          />
          <WelcomeLink href={constants.welcomePage.andMoreButton.url} target={constants.welcomePage.andMoreButton.target}>
            {strings.welcome.link.label()}
          </WelcomeLink>
          <WelcomeButtonWrapper>
            <Component.Button primary label={strings.welcome.button.label()} />
          </WelcomeButtonWrapper>
        </WelcomeInner>
      </WelcomeWrapper>
    </WelcomeContainer>
  );
};
