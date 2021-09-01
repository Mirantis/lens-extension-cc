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
 * @returns {Object} Emotion styles object.
 */
export const mixinFlexColumnGaps = function (gap = layout.gap) {
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

/**
 * Styles for columns in a Flex column layout.
 */
export const mixinColumnStyles = function () {
  return {
    // as flex children, grow/shrink evenly
    flex: 1,

    // as flex containers
    ...mixinFlexColumnGaps(layout.grid * 6),

    borderRadius: layout.grid,
    backgroundColor: 'var(--contentColor)',
    marginRight: layout.gap,
    padding: layout.gap,
    overflow: 'auto',
  };
};

/**
 * Common styles for pages.
 */
export const mixinPageStyles = function () {
  return {
    padding: layout.gap,
    backgroundColor: 'var(--mainBackground)',

    // style all <code> elements herein
    code: {
      // TODO: remove once https://github.com/lensapp/lens/issues/1683 is fixed
      // TRACKING: https://github.com/Mirantis/lens-extension-cc/issues/27
      fontSize: 'calc(var(--font-size) * .9)',
    },
  };
};
