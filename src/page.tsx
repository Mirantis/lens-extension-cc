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

export const AddClusterIcon = function () {
  // this is the current Mirantis Container Cloud icon
  return (
    <svg
      viewBox="0 0 64 73.593"
      width="16"
      height="16"
      style={{ fill: 'white' }}
    >
      <g transform="translate(-285.428 -293.889)">
        <path d="M317.869,353.583l-24.692-14.256,4.284-2.489L315.238,347.1a1,1,0,0,0,1-1.732l-23.061-13.315c.133-.069,4.854-2.881,4.855-2.7l6.51-3.783a1.007,1.007,0,0,0,0-1.73l-6.555-3.785a1,1,0,0,0-1,0l-6.509,3.783a1.008,1.008,0,0,0,0,1.731l4.952,2.859-4.747,2.759a1,1,0,0,0,0,1.731l4.784,2.761-4.786,2.781a1.007,1.007,0,0,0,0,1.73l26.187,15.119A1,1,0,0,0,317.869,353.583Zm-24.9-28.877,4.516-2.625,4.558,2.632-4.517,2.625Z" />
        <path d="M348.925,311.922l-31.209-17.9a.993.993,0,0,0-1,0l-30.791,17.9a1,1,0,0,0-.5.864v35.8a1,1,0,0,0,.5.864l30.791,17.9a.993.993,0,0,0,1,0l31.209-17.9a1,1,0,0,0,.5-.867v-35.8A1,1,0,0,0,348.925,311.922Zm-1.5,36.083-30.207,17.323-29.793-17.319V313.364l29.793-17.319,30.207,17.323Z" />
        <path d="M319.9,318.916a1,1,0,0,0,.5.865l6.555,3.784a1,1,0,0,0,1,0l6.51-3.784a1.007,1.007,0,0,0,0-1.73l-6.554-3.785a1,1,0,0,0-1,0l-6.512,3.785A1,1,0,0,0,319.9,318.916Zm7.514-2.63,4.556,2.632-4.517,2.626-4.558-2.632Z" />
        <path d="M324.506,323.837l-6.554-3.784a1,1,0,0,0-1,0l-6.51,3.784a1.007,1.007,0,0,0,0,1.73L317,329.351a1,1,0,0,0,1,0l6.51-3.782A1.007,1.007,0,0,0,324.506,323.837Zm-7.012,3.493-4.557-2.631,4.517-2.625,4.556,2.632Z" />
        <path d="M323.371,330.219a14.316,14.316,0,0,1,4.738-4.3,1.048,1.048,0,0,0-1.15-.083l-4.542,2.639-1.968,1.144a1.006,1.006,0,0,0,0,1.73c.4.231,1.219.707,1.622.936a16.563,16.563,0,0,1,1.047-1.7l-.174-.1A4.1,4.1,0,0,0,323.371,330.219Z" />
        <path d="M315.049,330.488a1,1,0,0,0-.5-.865l-6.554-3.784a.994.994,0,0,0-1,0l-6.51,3.783a1.007,1.007,0,0,0,0,1.73l6.554,3.784a1,1,0,0,0,1,0l6.509-3.783A1,1,0,0,0,315.049,330.488Zm-7.512,2.629-4.557-2.632,4.517-2.625,4.556,2.632Z" />
        <path d="M319.027,334.518a1,1,0,0,0,1-1.732l-2.022-1.168a1,1,0,0,0-1,0l-6.51,3.783a1.008,1.008,0,0,0,0,1.731l6.555,3.784a1,1,0,0,0,1,0l1.447-.841a1,1,0,0,0-1.006-1.729l-.945.55-4.558-2.632,4.517-2.625Z" />
        <path d="M300.432,319.789l6.554,3.783a1,1,0,0,0,.5.134.989.989,0,0,0,.5-.136l6.51-3.782a1.007,1.007,0,0,0,0-1.731l-6.554-3.784a1,1,0,0,0-1,0l-6.51,3.783A1.008,1.008,0,0,0,300.432,319.789Zm7.012-3.494L312,318.927l-4.517,2.624-4.557-2.631Z" />
        <path d="M310.386,312.271a1.008,1.008,0,0,0,0,1.731l6.554,3.784a1,1,0,0,0,1,0L324.458,314a1.008,1.008,0,0,0,0-1.731l-6.554-3.784a.994.994,0,0,0-1,0Zm7.017-1.764,4.557,2.631-4.519,2.626-4.557-2.631Z" />
        <path d="M343.223,331.6h0a2.968,2.968,0,0,0-2.866-.435c2.15-5.335-2.4-6.563-5.12-2.164a3.719,3.719,0,0,0-4.989-1.85l-.011-.006c-4.887,1.877-8.469,8.074-8.179,13.117a13.2,13.2,0,0,0-3.441,8.233c-.075,2.75,1.571,4.659,4.1,4.192,1.392-.126,8.553-4.705,9.9-5.365.508-.317,7.2-4.082,7.449-4.39C343.082,340.58,346.089,334.8,343.223,331.6Z" />
        <path d="M330.016,325.113a.978.978,0,0,0,1.4.445l1.15-.668,4.861-2.825,4.557,2.632a1.02,1.02,0,0,0,.293,1.987c.4.06,1.85-.968,2.2-1.126a1.007,1.007,0,0,0,0-1.73l-6.554-3.784a1,1,0,0,0-1,0l-6.512,3.784A.992.992,0,0,0,330.016,325.113Z" />
      </g>
    </svg>
  );
};

interface Props {
  extension: LensRendererExtension;
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
