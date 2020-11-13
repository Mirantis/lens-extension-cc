import React, { useEffect, useState } from 'react';
import { LensRendererExtension } from '@k8slens/extensions';
import { ThemeProvider } from 'emotion-theming';
import { View } from './cc/View';
import { ExtStateProvider } from './cc/store/ExtStateProvider';
import { ConfigProvider } from './cc/store/ConfigProvider';
import { AuthProvider } from './cc/store/AuthProvider';
import { ClustersProvider } from './cc/store/ClustersProvider';
import { AddClustersProvider } from './cc/store/AddClustersProvider';
import { lightThemeClassName, lightTheme, darkTheme } from './cc/theme';
import ExtensionRenderer from './renderer';

export { ContainerCloudIcon } from './cc/ContainerCloudIcon';

interface Props {
  extension: ExtensionRenderer;
}

export const AddClusterPage = function ({ extension }: Props) {
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
    <ThemeProvider theme={theme}>
      <ExtStateProvider>
        <ConfigProvider>
          <AuthProvider>
            <ClustersProvider>
              <AddClustersProvider>
                <View />
              </AddClustersProvider>
            </ClustersProvider>
          </AuthProvider>
        </ConfigProvider>
      </ExtStateProvider>
    </ThemeProvider>
  );
};
