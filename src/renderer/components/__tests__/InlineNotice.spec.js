import { render, screen } from 'testingUtility';
import { InlineNotice, types, iconSizes } from '../InlineNotice';

describe('/renderer/components/InlineNotice', () => {
  it('renders an default notice', () => {
    render(<InlineNotice />);

    expect(screen.getBySelector('i[material="info"]')).toBeInTheDocument();
    expect(screen.getBySelector('i[material="info"]')).toHaveStyle(
      'color: var(--colorInfo)'
    );
  });

  Object.values(types).forEach((type) => {
    Object.values(iconSizes).forEach((size) => {
      it(`renders an notice with |${type}| icon, |${size}| size and custom message`, () => {
        const text = 'text message';

        render(
          <InlineNotice type={type} iconSize={size}>
            {text}
          </InlineNotice>
        );

        let color;
        switch (type) {
          case types.NOTE:
            color = 'var(--textColorPrimary)';
            break;
          case types.INFO:
            color = 'var(--colorInfo)';
            break;
          case types.WARNING:
            color = 'var(--colorWarning)';
            break;
          case types.ERROR:
            color = 'var(--colorError)';
            break;
          case types.SUCCESS:
            color = 'var(--colorSuccess)';
            break;
          default:
            color = 'var(--colorVague)';
            break;
        }

        expect(
          screen.getBySelector(`i[material="${type}"]`)
        ).toBeInTheDocument();
        expect(screen.getBySelector(`i[material="${type}"]`)).toHaveStyle(
          `color: ${color}`
        );
        expect(
          screen.getBySelector(`i[material="${type}"]`).nextSibling
        ).toHaveStyle(
          `margin-top: ${size === iconSizes.SMALL ? '0px' : '2px'}`
        );
        expect(
          screen.getBySelector(`i[material="${type}"]`).nextSibling
        ).toHaveTextContent(text);
      });
    });
  });
});
