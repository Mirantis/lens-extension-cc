import * as styles from '../styles';

describe('/renderer/components/styles', () => {
  describe('mixinFlexColumnGaps()', () => {
    it('return styles that define a flex container, column-oriented, with default consistent gaps between its _immediate_ children', () => {
      expect(styles.mixinFlexColumnGaps()['> *'].marginBottom).toBe(
        styles.layout.gap
      );
    });

    it('return styles that define a flex container, column-oriented, with custom consistent gaps between its _immediate_ children', () => {
      expect(styles.mixinFlexColumnGaps(10)['> *'].marginBottom).toBe(10);
    });
  });

  describe('mixinColumnStyles()', () => {
    it('return styles for columns in a Flex column layout', () => {
      expect(styles.mixinColumnStyles()['> *'].marginBottom).toBe(
        styles.layout.grid * 6
      );
    });
  });
});
