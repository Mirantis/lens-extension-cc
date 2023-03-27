import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { WelcomeView } from '../WelcomeView';
import * as strings from '../../../../strings';
import * as constants from '../../../../constants';

describe('/renderer/components/GlobalSyncPage/WelcomeView', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders an Welcome page', () => {
    render(<WelcomeView openAddCloud={() => {}} />);

    const removeHtmlTags = (string) => {
      return string.replace(/<[^>]*>/g, '');
    };

    const containerCloudIcon = screen.getBySelector('svg');
    const containerCloudIconSize = '80';
    const containerCloudIconColor = 'var(--textColorAccent)';

    const welcomeLink = screen.getByText(strings.welcome.link.label());

    expect(containerCloudIcon).toHaveAttribute('width', containerCloudIconSize);
    expect(containerCloudIcon).toHaveAttribute(
      'height',
      containerCloudIconSize
    );
    expect(containerCloudIcon).toHaveStyle(`fill: ${containerCloudIconColor}`);

    expect(
      screen.getByText(removeHtmlTags(strings.welcome.titleHtml()))
    ).toBeInTheDocument();

    expect(screen.getByText(strings.welcome.description())).toBeInTheDocument();

    expect(screen.getBySelector('ul')).toHaveTextContent(
      strings.welcome.listItems().join('')
    );

    expect(welcomeLink).toBeInTheDocument();
    expect(welcomeLink).toHaveAttribute('target', '_blank');
    expect(welcomeLink).toHaveAttribute('href', constants.repository.readmeUrl);

    expect(
      screen.getByText(strings.welcome.button.label())
    ).toBeInTheDocument();
  });

  it('clicking on button triggers openAddCloud handler', async () => {
    const handler = jest.fn();
    render(<WelcomeView openAddCloud={handler} />);

    const buttonEl = screen.getByText(strings.welcome.button.label());

    await user.click(buttonEl);
    expect(handler).toHaveBeenCalled();
  });
});
