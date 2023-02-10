import { render, screen } from 'testingUtility';
import userEvent from '@testing-library/user-event';
import { TriStateCheckbox, checkValues } from '../TriStateCheckbox';

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
        value={checkValues.UNCHECKED}
      />
    );

    const checkboxEl = screen.getBySelector(
      '[data-cclex-component="TriStateCheckbox"]'
    );
    expect(
      checkboxEl.querySelector('.cclex-tristatecheckbox-field')
    ).toHaveAttribute('type', 'checkbox');
    expect(checkboxEl).toHaveTextContent(randomString);
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

      const ctrlEl = screen.getBySelector(
        '[data-cclex-component="TriStateCheckbox"] .cclex-tristatecheckbox-control'
      );

      if (checkValue === 'CHECKED') {
        expect(ctrlEl.querySelector('i[material="check"]')).toBeInTheDocument();
      } else if (checkValue === 'MIXED') {
        expect(
          ctrlEl.querySelector('i[material="remove"]')
        ).toBeInTheDocument();
      } else if (checkValue === 'UNCHECKED') {
        expect(ctrlEl.querySelector('i')).not.toBeInTheDocument();
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

      const fieldEl = screen.getBySelector(
        '[data-cclex-component="TriStateCheckbox"] .cclex-tristatecheckbox-field'
      );

      if (checkValue === 'CHECKED' || checkValue === 'MIXED') {
        expect(fieldEl.checked).toBe(true);
      } else if (checkValue === 'UNCHECKED') {
        expect(fieldEl.checked).toBe(false);
      } else {
        throw new Error(`Unknown value=${checkValue}`);
      }
    });

    ['control', 'label'].forEach((target) => {
      it(`clicking on |${checkValue}| checkbox |${target}| triggers onChange handler`, async () => {
        const handler = jest.fn();
        render(
          <TriStateCheckbox
            label={randomString}
            onChange={handler}
            value={checkValue}
          />
        );

        const targetEl = screen.getBySelector(
          `[data-cclex-component="TriStateCheckbox"] .cclex-tristatecheckbox-${target}`
        );

        await user.click(targetEl);
        expect(handler).toHaveBeenCalled();
        expect(handler.mock.calls[0][1]).toEqual({
          checked: checkValue === checkValues.CHECKED ? false : true,
        });
      });
    });
  });
});
