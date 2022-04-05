import React, { useEffect, useState } from 'react';
import { ThemeProvider, CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { SyncView } from './SyncView';
import { CloudProvider } from '../../store/CloudProvider';

import { lightThemeClassName, lightTheme, darkTheme } from '../theme';

export { ContainerCloudIcon as GlobalPageIcon } from '../ContainerCloudIcon';

export const GlobalPage = function () {
  //
  // STATE
  //

  const [theme, setTheme] = useState(
    document.body.classList.contains(lightThemeClassName)
      ? lightTheme
      : darkTheme
  );

  //
  // EFFECTS
  //

  // TODO: use mobx reaction() to detect theme updates once https://github.com/lensapp/lens/issues/1336
  //  is fixed and https://github.com/lensapp/lens/pull/1371 is shipped (beta.3)
  // Update (2020/11/27): Apparently, per the proposed fix for #1336, the right thing to
  //  do is use `mobx` to observe changes to `Theme.getActiveTheme().name`
  // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/24
  useEffect(function () {
    const observer = new MutationObserver(function (
      mutations: MutationRecord[]
    ) {
      mutations.forEach((mutation: MutationRecord) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (
            (mutation.target as HTMLElement).classList.contains(
              lightThemeClassName
            )
          ) {
            setTheme(lightTheme);
          } else {
            setTheme(darkTheme);
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return function () {
      observer.disconnect();
    };
  }, []); // run once on mount

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
