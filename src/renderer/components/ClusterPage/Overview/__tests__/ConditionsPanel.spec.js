import { render, screen } from 'testingUtility';
import { ConditionsPanel } from '../ConditionsPanel';
import * as strings from '../../../../../strings';

describe('/renderer/components/ClusterPage/Overview/ConditionsPanel', () => {
  describe('with conditions', () => {
    const testMessageForReadyCondition = 'Message for ready condition';
    const testMessageForNotReadyCondition = 'Message for not ready condition';
    const testEntity = {
      spec: {
        conditions: [
          {
            message: testMessageForReadyCondition,
            ready: true,
            type: 'Mock type 1',
          },
          {
            message: 'Mock message text content 2',
            ready: true,
            type: 'Mock type 2',
          },
          {
            message: 'Mock message text content 3',
            ready: true,
            type: 'Mock type 3',
          },
          {
            message: 'Mock message text content 4',
            ready: true,
            type: 'Mock type 4',
          },
          {
            message: testMessageForNotReadyCondition,
            ready: false,
            type: 'Mock type 5',
          },
          {
            message: 'Mock message text content 6',
            ready: true,
            type: 'Mock type 6',
          },
        ],
      },
    };

    it('renders list of conditions', () => {
      render(<ConditionsPanel clusterEntity={testEntity} />);

      testEntity.spec.conditions.forEach((condition) => {
        expect(screen.getByText(condition.type)).toBeInTheDocument();
      });
    });

    it('renders condition circle with correct color', () => {
      render(<ConditionsPanel clusterEntity={testEntity} />);

      const readyConditionCircle = screen
        .getByText(testMessageForReadyCondition)
        .parentNode.querySelector('span');
      const notReadyConditionCircle = screen
        .getByText(testMessageForNotReadyCondition)
        .parentNode.querySelector('span');

      expect(readyConditionCircle).toHaveStyle(
        'background-color: var(--colorSuccess)'
      );
      expect(notReadyConditionCircle).toHaveStyle(
        'background-color: var(--colorWarning)'
      );
    });
  });

  describe('without conditions', () => {
    const testEntity = {
      spec: {
        conditions: [],
      },
    };

    it('renders an error message', () => {
      render(<ConditionsPanel clusterEntity={testEntity} />);

      expect(
        screen.getByText(
          strings.clusterPage.pages.overview.clusterConditions.noStatus()
        )
      ).toBeInTheDocument();
    });
  });
});
