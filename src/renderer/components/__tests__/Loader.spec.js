import { render, screen } from 'testingUtility';
import { Loader } from '../Loader';

describe('/renderer/components/Loader', () => {
  it('renders |with| a message', () => {
    const message = 'test message';

    render(<Loader message={message} />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.getByText(message).parentNode.querySelector('.Spinner')
    ).toBeInTheDocument();
  });

  it('renders |with| a message, which contain HTML', () => {
    const message = 'test message';
    const messageHtml = `<p>${message}</p>`;

    render(<Loader message={messageHtml} />);

    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('renders |without| a message', () => {
    render(<Loader />);

    expect(screen.queryBySelector('p')).not.toBeInTheDocument();
    expect(document.querySelector('.Spinner')).toBeInTheDocument();
  });
});
