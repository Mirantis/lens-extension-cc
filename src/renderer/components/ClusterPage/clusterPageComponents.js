import styled from '@emotion/styled';
import { layout, mixinPageStyles } from '../styles';

export const PageContainer = styled.div(() => ({
  ...mixinPageStyles(),
  padding: '0',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
}));

export const DrawerTitleWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  marginTop: -layout.pad * 3,
  marginBottom: -layout.pad * 3,
}));

export const DrawerItemsWrapper = styled.div(() => ({
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  paddingBottom: layout.pad * 2.25,
  backgroundColor: 'var(--contentColor)',

  '& > div': {
    paddingTop: layout.pad * 1.5,
    paddingBottom: layout.pad * 1.5,
  },
}));

export const Link = styled.a(() => ({
  color: 'var(--primary)',
}));
