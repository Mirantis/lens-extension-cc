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
  // nothing needed at the moment; all colors needed are provided by Lens as CSS vars
};

export const darkTheme = {
  mode: themeModes.DARK,
  // nothing needed at the moment; all colors needed are provided by Lens as CSS vars
};

if (DEV_ENV) {
  // make sure themes are synced
  [lightTheme, darkTheme].forEach((theme) => {
    rtv.verify(
      { theme },
      {
        theme: {
          mode: [rtv.STRING, { oneOf: Object.values(themeModes) }],
        },
      }
    );
  });
}
