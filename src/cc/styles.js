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
 * Styles that define a custom themed scroll bar, to be applied to a container that
 *  should be scrollable.
 *
 * NOTE: This only works in Webkit-based browsers.
 *
 * @param {Object} options
 * @param {Object} options.theme Active theme.
 * @param {number} [options.size] Pixels, width/height of various scrollbar parts, also radius
 *  of the thumb. The scrollbar will always be as tall/wide as the container it pertains to.
 * @param {number} [options.borderWidth] Pixels, thickness of the border on scrollbar parts.
 * @param {boolean} [options.scrollable] True if the generated styles should include `overflow: auto`.
 *  Set to `false` if you want to enable scrolling only in one direction, or some other way.
 * @returns {Object} Emotion styles object.
 */
export const mixinCustomScrollbar = function ({
  theme,
  size = 7,
  borderWidth = 5,
  scrollable = true,
}) {
  const backgroundColor = theme.color.scrollbar.background;
  const actualSize = size + borderWidth * 2;

  // @see https://github.com/lensapp/lens/blob/70a8982c9f6396107f92aeced465620761d90726/src/renderer/components/mixins.scss#L25
  return {
    overflow: scrollable ? 'auto' : undefined,

    '&::-webkit-scrollbar': {
      width: actualSize,
      height: actualSize,
      backgroundColor: 'transparent',
    },

    '&::-webkit-scrollbar-thumb': {
      backgroundColor,
      backgroundClip: 'padding-box',
      borderWidth,
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderRadius: actualSize,
    },

    '&::-webkit-scrollbar-corner': {
      backgroundColor: 'transparent',
    },
  };
};
