import styled from '@emotion/styled';
import { keyframes } from '@emotion/css';
import { Renderer } from '@k8slens/extensions';
import { layout, mixinPageStyles } from '../styles';

const {
  Component: { SearchInput },
} = Renderer;

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

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

export const TablePanelWrapper = styled.div(() => ({
  background: 'var(--contentColor)',
  height: '100%',
}));

export const TableTopItems = styled.div(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: layout.pad * 2,
}));

export const TableSettings = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
}));

export const TableSyncButton = styled.button(
  ({ isDisabled, isCloudFetching }) => ({
    marginRight: layout.pad * 2,
    pointerEvents: isDisabled ? 'none' : 'auto',
    opacity: isDisabled ? '0.5' : '1',
    animation: isCloudFetching ? `${rotate} 2s linear infinite` : 'none',
  })
);

export const TableSearch = styled(SearchInput)(() => ({
  marginLeft: layout.pad * 1.25,
}));
