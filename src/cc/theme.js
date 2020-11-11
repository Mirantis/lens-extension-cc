import rtv from 'rtvjs';

// name of the light theme class name added by Lens to the <body> element;
//  if the class name isn't listed, assume DARK mode is active
export const lightThemeClassName = 'theme-light';

export const themeModes = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
});

export const lightTheme = {
  mode: themeModes.LIGHT,
  color: {
    scrollbar: {
      // @see https://github.com/lensapp/lens/blob/70a8982c9f6396107f92aeced465620761d90726/src/renderer/components/mixins.scss#L27
      background: '#bbb',
    },
  },
};

export const darkTheme = {
  mode: themeModes.DARK,
  color: {
    scrollbar: {
      // @see https://github.com/lensapp/lens/blob/70a8982c9f6396107f92aeced465620761d90726/src/renderer/components/mixins.scss#L28
      background: '#5f6064',
    },
  },
};

if (DEV_ENV) {
  // make sure themes are synced
  [lightTheme, darkTheme].forEach((theme) => {
    rtv.verify(
      { theme },
      {
        theme: {
          mode: [rtv.STRING, { oneOf: Object.values(themeModes) }],
          color: {
            scrollbar: {
              background: rtv.STRING,
            },
          },
        },
      }
    );
  });
}
