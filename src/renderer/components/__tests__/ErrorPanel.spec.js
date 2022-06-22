import { render, screen } from 'testingUtility';
import { ErrorPanel } from '../ErrorPanel';

describe('/renderer/components/ErrorPanel', () => {
  const message = 'test message';

  it('renders |without| a message', () => {
    render(<ErrorPanel />);

    expect(
      screen.getBySelector('i[material="error_outline"]')
    ).toBeInTheDocument();
    expect(screen.getBySelector('p')).toHaveTextContent('');
  });

  it('renders |with| a message', () => {
    render(<ErrorPanel>{message}</ErrorPanel>);

    expect(
      screen.getBySelector('i[material="error_outline"]')
    ).toBeInTheDocument();
    expect(screen.getBySelector('p')).toHaveTextContent(message);
  });
});
