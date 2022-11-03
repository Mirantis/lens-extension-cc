import { render, screen } from 'testingUtility';
import styled from '@emotion/styled';
import { themeModes } from '../../theme';
import { ClusterPage } from '../ClusterPage';

describe('/renderer/components/ClusterPage/ClusterPage', () => {
  const testMessage = 'test message';
  const TestChildrenComponent = () => {
    const Paragraph = styled.p(({ theme }) => ({
      color: theme.mode === themeModes.LIGHT ? 'red' : 'blue',
    }));

    return <Paragraph>{testMessage}</Paragraph>;
  };

  [themeModes.LIGHT, themeModes.DARK].forEach((themeMode) => {
    describe(`|${themeMode}| mode`, () => {
      beforeEach(() => {
        if (themeMode === themeModes.LIGHT) {
          document.querySelector('body').classList.add('theme-light');
        } else {
          document.querySelector('body').classList.remove('theme-light');
        }
      });

      it('renders a ClusterPage with children components', () => {
        render(
          <ClusterPage>
            <TestChildrenComponent />
          </ClusterPage>
        );

        expect(screen.getByText(testMessage)).toBeInTheDocument();

        if (themeMode === themeModes.LIGHT) {
          expect(screen.getByText(testMessage)).toHaveStyle('color: red');
        } else {
          expect(screen.getByText(testMessage)).toHaveStyle('color: blue');
        }
      });
    });
  });
});
