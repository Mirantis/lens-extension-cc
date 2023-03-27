import { useEffect, useState } from 'react';
import { lightThemeClassName, lightTheme, darkTheme } from '../theme';

/**
 * Meant for use in conjunction with Emotion's ThemeProvider
 * in order to match the theme used to the theme Lens is using.
 * Note: this is not a replacement for Emotion's useTheme() hook.
 * @returns {{ theme: Object }} Object with a theme property that is the theme object to be used by the ThemeProvider.
 */
export const useThemeSwitching = () => {
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
    /* istanbul ignore next -- JSDom does not support the MutationObserver API */
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (mutation.target.classList.contains(lightThemeClassName)) {
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

  return {
    theme,
  };
};
