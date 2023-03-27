import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as useCheckboxes from '../useCheckboxes';
import { checkValues } from '../../../TriStateCheckbox/TriStateCheckbox';

describe('/renderer/components/hooks/useCheckboxes', () => {
  const testSyncedNamespaces = {
    namespaces: [
      {
        name: 'namespaces-1',
        synced: true,
      },
      {
        name: 'namespaces-2',
        synced: true,
      },
      {
        name: 'namespaces-3',
        synced: true,
      },
    ],
  };

  const testUnsyncedNamespaces = {
    namespaces: [
      {
        name: 'namespaces-1',
        synced: false,
      },
      {
        name: 'namespaces-2',
        synced: false,
      },
      {
        name: 'namespaces-3',
        synced: false,
      },
    ],
  };

  const testMixedSyncedNamespaces = {
    namespaces: [
      {
        name: 'namespaces-1',
        synced: false,
      },
      {
        name: 'namespaces-2',
        synced: true,
      },
      {
        name: 'namespaces-3',
        synced: true,
      },
    ],
  };

  const testEmptyNamespaces = {
    namespaces: [],
  };

  describe('makeCheckboxesInitialState()', () => {
    it('return initial state for |synced| namespaces', () => {
      expect(
        useCheckboxes.makeCheckboxesInitialState(testSyncedNamespaces).parent
      ).toBe(true);
      expect(
        Object.values(
          useCheckboxes.makeCheckboxesInitialState(testSyncedNamespaces)
            .children
        ).every((el) => el === true)
      ).toBe(true);
    });

    it('return initial state for |unsynced| namespaces', () => {
      expect(
        useCheckboxes.makeCheckboxesInitialState(testUnsyncedNamespaces).parent
      ).toBe(false);
      expect(
        Object.values(
          useCheckboxes.makeCheckboxesInitialState(testUnsyncedNamespaces)
            .children
        ).every((el) => el === false)
      ).toBe(true);
    });

    it('return initial state for |mixed| (synced and unsynced) namespaces', () => {
      expect(
        useCheckboxes.makeCheckboxesInitialState(testMixedSyncedNamespaces)
          .parent
      ).toBe(true);
      expect(
        Object.values(
          useCheckboxes.makeCheckboxesInitialState(testMixedSyncedNamespaces)
            .children
        ).some((el) => el === true) &&
          Object.values(
            useCheckboxes.makeCheckboxesInitialState(testMixedSyncedNamespaces)
              .children
          ).some((el) => el === false)
      ).toBe(true);
    });
  });

  describe('useCheckboxes()', () => {
    describe('getSyncedData()', () => {
      it('get synced and ignored namespaces', () => {
        const TestComponent = ({ testData }) => {
          const { getSyncedData } = useCheckboxes.useCheckboxes(
            useCheckboxes.makeCheckboxesInitialState(testData)
          );
          const { syncedNamespaces, ignoredNamespaces } = getSyncedData();

          return (
            <div>
              <p data-testid="synced">{syncedNamespaces}</p>
              <p data-testid="ignored">{ignoredNamespaces}</p>
            </div>
          );
        };

        render(<TestComponent testData={testMixedSyncedNamespaces} />);

        const ignoredNamespaces = [];
        const syncedNamespaces = [];

        Object.keys(
          useCheckboxes.makeCheckboxesInitialState(testMixedSyncedNamespaces)
            .children
        ).forEach((name) => {
          if (
            useCheckboxes.makeCheckboxesInitialState(testMixedSyncedNamespaces)
              .children[name]
          ) {
            syncedNamespaces.push(name);
          } else {
            ignoredNamespaces.push(name);
          }
        });

        expect(screen.getByTestId('synced')).toHaveTextContent(
          syncedNamespaces.join('')
        );
        expect(screen.getByTestId('ignored')).toHaveTextContent(
          ignoredNamespaces.join('')
        );
      });
    });

    describe('getCheckboxValue()', () => {
      const TestGetCheckboxValueComponent = ({ testData }) => {
        const { getCheckboxValue } = useCheckboxes.useCheckboxes(
          useCheckboxes.makeCheckboxesInitialState(testData)
        );

        return (
          <div>
            <label>
              <input
                type="checkbox"
                checked={
                  getCheckboxValue({ isParent: true }) !== checkValues.UNCHECKED
                }
                onChange={() => {}}
              />
              test parent checkbox
            </label>
          </div>
        );
      };

      it('get parent checkbox value from synced namespaces', () => {
        render(
          <TestGetCheckboxValueComponent testData={testSyncedNamespaces} />
        );

        expect(screen.getByLabelText('test parent checkbox')).toBeChecked();
      });

      it('get parent checkbox value from unsynced namespaces', () => {
        render(
          <TestGetCheckboxValueComponent testData={testUnsyncedNamespaces} />
        );

        expect(screen.getByLabelText('test parent checkbox')).not.toBeChecked();
      });

      it('get parent checkbox value from mixed synced and unsynced namespaces', () => {
        render(
          <TestGetCheckboxValueComponent testData={testMixedSyncedNamespaces} />
        );

        expect(screen.getByLabelText('test parent checkbox')).toBeChecked();
      });

      it('get parent checkbox value from empty namespaces', () => {
        render(
          <TestGetCheckboxValueComponent testData={testEmptyNamespaces} />
        );

        expect(screen.getByLabelText('test parent checkbox')).not.toBeChecked();
      });
    });

    describe('setCheckboxValue()', () => {
      let user;

      beforeEach(() => {
        user = userEvent.setup();
      });

      const TestSetCheckboxValueComponent = ({ testData }) => {
        const { getCheckboxValue, setCheckboxValue } =
          useCheckboxes.useCheckboxes(
            useCheckboxes.makeCheckboxesInitialState(testData)
          );

        return (
          <div>
            <label>
              <input
                type="checkbox"
                checked={
                  getCheckboxValue({ isParent: true }) !== checkValues.UNCHECKED
                }
                onChange={() => setCheckboxValue({ isParent: true })}
              />
              test parent checkbox
            </label>

            <ul></ul>
            {testData.namespaces.map((namespace) => (
              <li key={namespace.name}>
                <label>
                  <input
                    type="checkbox"
                    checked={
                      getCheckboxValue({ name: namespace.name }) !==
                      checkValues.UNCHECKED
                    }
                    onChange={() => setCheckboxValue({ name: namespace.name })}
                  />
                  {namespace.name}
                </label>
              </li>
            ))}
          </div>
        );
      };

      it('check parent checkbox by checking children checkbox', async () => {
        render(
          <TestSetCheckboxValueComponent testData={testUnsyncedNamespaces} />
        );

        const parentCheckbox = screen.getByLabelText('test parent checkbox');
        let childrenCheckbox;

        testUnsyncedNamespaces.namespaces.forEach((namespace) => {
          childrenCheckbox = screen.getByLabelText(namespace.name);
        });

        // initial parent checkbox state (unchecked)
        expect(parentCheckbox).not.toBeChecked();

        await user.click(childrenCheckbox);

        // parent checkbox state (checked) after checking children checkbox
        expect(parentCheckbox).toBeChecked();
      });

      it('check all children checkboxes by checking parent checkbox', async () => {
        render(
          <TestSetCheckboxValueComponent testData={testUnsyncedNamespaces} />
        );

        // initial children checkboxes state (all unchecked)
        testUnsyncedNamespaces.namespaces.forEach((namespace) => {
          expect(screen.getByLabelText(namespace.name)).not.toBeChecked();
        });

        await user.click(screen.getByLabelText('test parent checkbox'));

        // children checkboxes state (all checked) after checking parent checkbox
        testUnsyncedNamespaces.namespaces.forEach((namespace) => {
          expect(screen.getByLabelText(namespace.name)).toBeChecked();
        });
      });
    });
  });
});
