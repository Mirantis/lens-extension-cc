//
// Main view for the WelcomePage
//

import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { mixinPageStyles } from '../styles';
import { ContainerCloudIcon } from '../ContainerCloudIcon';

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
    fontSize: 24,
    lineHeight: '30px',
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
    maxWidth: 717,
    width: '100%',
    backgroundColor: 'var(--layoutBackground)',
  };
});

const WelcomeIconWrapper = styled.div(function () {
  return {
    width: '100%',
    textAlign: 'center',
    paddingTop: 32,
    marginBottom: 22,
  };
});

const WelcomeTitle = styled.h1(function () {
  return {
    fontSize: 36,
    lineHeight: '40px',
    textAlign: 'center',
    marginBottom: 24,
  };
});

const WelcomeDescription = styled.p(function () {
  return {
    marginBottom: 36,
  };
});

const WelcomeList = styled.ul(function () {
  return {
    marginBottom: 20,

    'li:not(:last-of-type)': {
      marginBottom: 16,
    },

    'li::before': {
      content: '"-"',
      marginRight: 4,
    },
  };
});

const WelcomeLink = styled.a(function () {
  return {
    textDecoration: 'none',
    color: 'var(--blue)',
  };
});

const WelcomeButtonWrapper = styled.div(function () {
  return {
    width: '100%',
    textAlign: 'center',
    marginTop: 48,
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
            <ContainerCloudIcon size={100} fill='#FFFFFF' />
          </WelcomeIconWrapper>
          <WelcomeTitle>Welcome to the <br/>Mirantis Container Cloud for Lens Extention</WelcomeTitle>
          <WelcomeDescription>This extension enables you to connect to multiple Mirantis Container Cloud management clusters through Lens. You can now leverage Lens for basic lifecycle management operations such as:</WelcomeDescription>
          <WelcomeList>
            <li>Synchronizing projects to view and manage their resources in the Lens Catalog</li>
            <li>Monitoring real-time cluster status and resource utilization in Lens</li>
            <li>Creating and deleting clusters in your projects from Lens</li>
          </WelcomeList>
          <WelcomeLink href='#'>And more!</WelcomeLink>
          <WelcomeButtonWrapper>
            <Component.Button
              primary
              label='Add your first management cluster'
            />
          </WelcomeButtonWrapper>
        </WelcomeInner>
      </WelcomeWrapper>
    </WelcomeContainer>
  );
};
