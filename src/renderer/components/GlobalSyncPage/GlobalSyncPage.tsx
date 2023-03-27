import React from 'react';
import { ThemeProvider, CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { SyncView } from './SyncView';
import { CloudProvider } from '../../store/CloudProvider';
import { useThemeSwitching } from '../hooks/useThemeSwitching';

export { ContainerCloudIcon as GlobalSyncPageIcon } from '../ContainerCloudIcon';

export const GlobalSyncPage = function () {
  const { theme } = useThemeSwitching();

  //
  // RENDER
  //

  return (
    <CacheProvider value={createCache({ key: 'lens-extension-cc' })}>
      <ThemeProvider theme={theme}>
        <CloudProvider>
          <SyncView />
        </CloudProvider>
      </ThemeProvider>
    </CacheProvider>
  );
};
