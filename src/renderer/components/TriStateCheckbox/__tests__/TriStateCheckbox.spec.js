import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { TriStateCheckbox } from '../TriStateCheckbox';

describe('/renderer/components/TriStateCheckbox', () => {
  const randomString = (Math.random() + 1).toString(36).substring(7);
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('render checkbox with label', () => {
    render(
      <TriStateCheckbox
        label={randomString}
        onChange={() => {}}
        value={randomString}
      />
    );

    const checkboxEl = screen.getBySelector('input[type="checkbox"]');
    expect(checkboxEl).toHaveAttribute('type', 'checkbox');
    expect(checkboxEl.parentNode).toHaveTextContent(randomString);
  });

  ['CHECKED', 'MIXED', 'UNCHECKED'].forEach((checkValue) => {
    it(`|${checkValue}| depends on value, shows different icon`, () => {
      render(
        <TriStateCheckbox
          label={randomString}
          onChange={() => {}}
          value={checkValue}
        />
      );

      const checkboxEl = screen.getBySelector('input[type="checkbox"]');

      if (checkValue === 'CHECKED') {
        expect(
          checkboxEl.parentNode.parentNode.querySelector('i[material="check"]')
        ).toBeInTheDocument();
      } else if (checkValue === 'MIXED') {
        expect(
          checkboxEl.parentNode.parentNode.querySelector('i[material="remove"]')
        ).toBeInTheDocument();
      } else if (checkValue === 'UNCHECKED') {
        expect(
          checkboxEl.parentNode.parentNode.querySelector('i')
        ).not.toBeInTheDocument();
      } else {
        throw new Error(`Unknown value=${checkValue}`);
      }
    });

    it(`|${checkValue}| checkbox state with different values`, () => {
      render(
        <TriStateCheckbox
          label={randomString}
          onChange={() => {}}
          value={checkValue}
        />
      );

      const checkboxEl = screen.getBySelector('input[type="checkbox"]');

      if (checkValue === 'CHECKED' || checkValue === 'MIXED') {
        expect(checkboxEl.checked).toBe(true);
      } else if (checkValue === 'UNCHECKED') {
        expect(checkboxEl.checked).toBe(false);
      } else {
        throw new Error(`Unknown value=${checkValue}`);
      }
    });
  });

  it('clicking on checkbox triggers onClick handler', async () => {
    const handler = jest.fn();
    render(
      <TriStateCheckbox
        label={randomString}
        onChange={handler}
        value={randomString}
      />
    );

    const checkboxEl = screen.getBySelector('input[type="checkbox"]');

    await user.click(checkboxEl);
    expect(handler).toHaveBeenCalled();
  });
});
