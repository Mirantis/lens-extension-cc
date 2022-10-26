import { render, screen } from 'testingUtility';
import { ClusterConditionsPanelContent } from '../ClusterConditionsPanelContent';
import * as strings from '../../../../../strings';

describe('/renderer/components/ClusterPage/Overview/ClusterConditionsPanelContent', () => {
  const testConditions = [
    {
      message: 'Mock message text content 1',
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
      message: 'Mock message text content 5',
      ready: false,
      type: 'Mock type 5',
    },
    {
      message: 'Mock message text content 6',
      ready: true,
      type: 'Mock type 6',
    },
  ];

  it('renders an Cluster conditions list', () => {
    render(<ClusterConditionsPanelContent conditions={testConditions} />);

    testConditions.forEach((condition) => {
      expect(screen.getByText(condition.type)).toBeInTheDocument();
    });
  });

  it('renders an error message if `conditions` is empty', () => {
    render(<ClusterConditionsPanelContent conditions={[]} />);

    expect(
      screen.getByText(
        strings.clusterPage.pages.overview.clusterConditions.noStatus()
      )
    ).toBeInTheDocument();
  });
});
