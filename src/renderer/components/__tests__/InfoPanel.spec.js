import { render, screen } from 'testingUtility';
import { InfoPanel } from '../InfoPanel';

describe('/renderer/components/InfoPanel', () => {
  const message = 'test message';

  it('renders |without| a message', () => {
    render(<InfoPanel />);

    expect(
      screen.getBySelector('i[material="info_outline"]')
    ).toBeInTheDocument();
    expect(screen.getBySelector('p')).toHaveTextContent('');
  });

  it('renders |with| a message', () => {
    render(<InfoPanel>{message}</InfoPanel>);

    expect(
      screen.getBySelector('i[material="info_outline"]')
    ).toBeInTheDocument();
    expect(screen.getBySelector('p')).toHaveTextContent(message);
  });
});
