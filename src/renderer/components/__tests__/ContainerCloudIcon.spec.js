import { render, screen } from 'testingUtility';
import { ContainerCloudIcon } from '../ContainerCloudIcon';

describe('/renderer/components/ContainerCloudIcon', () => {
  it('renders an default icon', () => {
    render(<ContainerCloudIcon />);

    const icon = screen.getBySelector('svg');

    const defaultIconSize = '16';
    const defaultIconColor = 'currentColor';

    expect(icon).toHaveAttribute('width', defaultIconSize);
    expect(icon).toHaveAttribute('height', defaultIconSize);
    expect(icon).toHaveStyle(`fill: ${defaultIconColor}`);
  });

  it('renders an icon with custom size and color', () => {
    const customIconSize = '24';
    const customIconColor = '#000000';

    render(<ContainerCloudIcon size={customIconSize} fill={customIconColor} />);

    const icon = screen.getBySelector('svg');

    expect(icon).toHaveAttribute('width', customIconSize);
    expect(icon).toHaveAttribute('height', customIconSize);
    expect(icon).toHaveStyle(`fill: ${customIconColor}`);
  });
});
