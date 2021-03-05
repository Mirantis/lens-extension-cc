"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.darkTheme = exports.lightTheme = exports.themeModes = exports.lightThemeClassName = void 0;

var rtv = _interopRequireWildcard(require("rtvjs"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// name of the light theme class name added by Lens to the <body> element;
//  if the class name isn't listed, assume DARK mode is active
const lightThemeClassName = 'theme-light';
exports.lightThemeClassName = lightThemeClassName;
const themeModes = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark'
});
exports.themeModes = themeModes;
const lightTheme = {
  mode: themeModes.LIGHT // nothing needed at the moment; all colors needed are provided by Lens as CSS vars

};
exports.lightTheme = lightTheme;
const darkTheme = {
  mode: themeModes.DARK // nothing needed at the moment; all colors needed are provided by Lens as CSS vars

};
exports.darkTheme = darkTheme;

if (DEV_ENV) {
  // make sure themes are synced
  [lightTheme, darkTheme].forEach(theme => {
    rtv.verify({
      theme
    }, {
      theme: {
        mode: [rtv.STRING, {
          oneOf: Object.values(themeModes)
        }]
      }
    });
  });
}