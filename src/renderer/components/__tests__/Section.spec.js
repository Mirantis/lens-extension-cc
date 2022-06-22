import { render, screen } from 'testingUtility';
import { Section } from '../Section';

describe('/renderer/components/Section', () => {
  it('renders an Section', () => {
    render(<Section />);

    expect(screen.getBySelector('section')).toBeInTheDocument();
  });
});
