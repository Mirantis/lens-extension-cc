const grid = 4; // (px) grid unit

// Layout is not theme-specific, should we ever end-up with a light and dark theme
export const layout = {
  grid,
  pad: grid * 2, // padding or margin
  gap: grid * 4, // matches flex.box 'gaps' that the Lens Add Cluster Wizard uses
};

/**
 * Styles that define a flex container, column-oriented, with consistent gaps
 *  between its _immediate_ children.
 * @param {number} [gap] Space, in pixels, between immediate children.
 * @returns {Object} Styles object.
 */
export const flexColumnGaps = function (gap = layout.gap) {
  return {
    display: 'flex',
    flexDirection: 'column',

    // separate each immediate child (i.e. sections) by a common gap except for the last one
    '> *': {
      marginBottom: gap,
    },
    '> *:last-child': {
      marginBottom: 0,
    },
  };
};

export const theme = {};
