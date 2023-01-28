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
  alignItems: 'center',
  height: '100%',
  overflow: 'auto',

  // this means the entire Lens window is ~1000px and is necessary to force scrolling
  //  when it's smaller because the various cluster pages we have don't render well
  //  under 690px
  minWidth: 690,
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
  width: '100%',
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

export const PanelsWrapper = styled.div(() => ({
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',

  '& > div:not(:last-of-type)': {
    paddingBottom: layout.pad * 2.5,
  },
}));

export const PanelItem = styled.div(({ isHalfWidth }) => ({
  width: isHalfWidth ? `calc(50% - ${layout.grid * 2.5}px)` : '100%',
  display: 'flex',
  flexDirection: 'column',
}));
