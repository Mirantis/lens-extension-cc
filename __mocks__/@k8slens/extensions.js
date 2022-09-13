import { computed, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react';
import React, { useEffect, useState } from 'react';
import propTypes from 'prop-types';
import ReactSelect, { components } from 'react-select';
import ReactSelectCreatable from 'react-select/creatable';
import { cx } from '@emotion/css';

const { Menu: SelectMenu } = components;

const childrenPropType = propTypes.oneOfType([
  propTypes.node,
  propTypes.arrayOf(propTypes.node),
]);

export class _Select extends React.Component {
  static defaultProps = {
    autoConvertOptions: true,
    menuPortalTarget: document.body,
    menuPlacement: 'auto',
  };

  constructor(props) {
    super(props);
    makeObservable(this, {
      selectedOption: computed,
      options: computed,
    });
  }

  isValidOption(opt) {
    return typeof opt === 'object' && opt.value !== undefined;
  }

  get selectedOption() {
    // eslint-disable-next-line react/prop-types
    const { value, isMulti } = this.props;

    if (isMulti) {
      return this.options.filter((opt) => {
        const values = value ? [].concat(value) : [];

        return values.includes(opt) || values.includes(opt.value);
      });
    }

    return (
      this.options.find((opt) => opt === value || opt.value === value) || null
    );
  }

  get options() {
    // eslint-disable-next-line react/prop-types
    const { autoConvertOptions, options } = this.props;

    if (autoConvertOptions && Array.isArray(options)) {
      // eslint-disable-next-line react/prop-types
      return options.map((opt) => {
        return this.isValidOption(opt)
          ? opt
          : { value: opt, label: String(opt) };
      });
    }

    return options;
  }

  onChange = (value, meta) => {
    if (this.props.onChange) {
      this.props.onChange(value, meta);
    }
  };

  render() {
    const {
      isCreatable,
      components: _components,
      id: inputId,
      ...props
    } = this.props;
    const WrappedMenu = components.Menu ?? SelectMenu;

    const selectProps = {
      ...props,
      ...(inputId ? { inputId } : {}),
      value: this.selectedOption,
      options: this.options,
      onChange: this.onChange,
      className: 'Select',
      classNamePrefix: 'Select',
      components: {
        ..._components,
        Menu: () => <WrappedMenu {...props} />,
      },
    };

    return isCreatable ? (
      <ReactSelectCreatable {...selectProps} /> // select list with ability to add new options
    ) : (
      <ReactSelect {...selectProps} />
    );
  }
}

export const Select = observer(_Select);

class Singleton {
  static instances = new WeakMap();

  static getInstance() {
    return Singleton.instances.get(this);
  }

  static createInstance(...args) {
    // NOTE: `this` is always a reference to the context in which this function was called,
    //  which means, since `createInstance()` is a static method which will ultimately get
    //  set in the prototype chain directly off the Singleton constructor function (when this
    //  code is distilled down to ES5) and then called as `ExtendingSingletonClass.createInstance()`,
    //  it will be a reference to the constructor function of the class extending from
    //  Singleton (e.g. the `ExtendingSingleClass` function in this case, which we can "new"
    //  because it's a function).
    // NOTE: The prototype chain will be like this, `ExtendingSingletonClass.__proto__ -> Singleton`
    //  (the Singleton function itself, setup as the "prototype of" the ExtendingSingletonClass
    //  function). Since `createInstance()` is static, ES5 places it as a property of the Singleton
    //  function, like `Singleton.createInstance()`, and so because of the prototype chain of
    //  ExtendingSingletonClass, all of Singleton's "static" methods get "inherited" by all
    //  classes extending from Singleton such that `ExtendingSingletonClass.createInstance()`
    //  is callable -- it ultimately calls `Singleton.createInstance()` __directly__, but since
    //  it's called off of ExtendingSingletonClass, `this` ends-up being a reference to
    //  ExtendingSingletonClass (the function), not Singleton (the function), and so
    //  `new this(...args)` creates a new instance of ExtendingSingletonClass.
    // NOTE: In the Lens code, this function `createInstance()` is actually declared like this:
    // ```
    //   static createInstance<T, R extends any[]>(this: StaticThis<T, R>, ...args: R): T {
    //     if (!Singleton.instances.has(this)) ...
    //   }
    // ```
    //  but that's deceiving because it makes it look like there's this implicitly-bound
    //  `this` as a first parameter. Turns out this is just weird TypeScript syntax to declare
    //  the type of `this` in the case of this static class method.
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new this(...args));
    }

    return this.getInstance();
  }
}

class Ipc extends Singleton {
  listen(channel, callback) {}

  invoke(channel, callback) {
    return Promise.resolve();
  }

  broadcast(channel, ...args) {}
}

class KubernetesCluster {
  constructor(props) {
    Object.assign(this, props);
  }

  getId() {
    return 'uid';
  }
}

export class CatalogEntity {
  constructor(props) {
    Object.assign(this, props);
  }
}

class CatalogCategory {
  constructor(props) {
    Object.assign(this, props);
  }
}

class Spinner extends React.Component {
  static defaultProps = {
    singleColor: true,
    center: false,
  };

  render() {
    const { center, singleColor, ...props } = this.props;

    return (
      <div
        {...props}
        className={`Spinner ${center ? 'center' : ''} ${
          singleColor ? 'singleColor' : ''
        }`}
      />
    );
  }
}

let confirmDialogInstance;

class ConfirmDialog extends React.Component {
  constructor(props) {
    super(props);

    if (confirmDialogInstance) {
      throw new Error('MOCK: only one instance expected at any given time');
    }
    confirmDialogInstance = this;

    this.state = {
      isOpen: false,
      ok: null,
      cancel: null,
    };
  }

  static open = (props) => {
    const { ok, cancel } = props;

    if (!confirmDialogInstance) {
      throw new Error(
        'MOCK: When testing something that uses ConfirmDialog, <ConfirmDialog /> must be rendered alongside the component being rendered with render().\n-> Try `render(<><ConfirmDialog /><ComponentToTest /></>)`'
      );
    }

    confirmDialogInstance.setState({
      isOpen: true,
      ok,
      cancel,
    });
  };

  ok = () => {
    this.state.ok?.();
    this.setState({
      isOpen: false,
    });
  };

  cancel = () => {
    this.state.cancel?.();
    this.setState({
      isOpen: false,
    });
  };

  render() {
    return (
      this.state.isOpen && (
        <div className="confirm-buttons">
          <button className="cancel" onClick={this.cancel}></button>
          <button className="ok" onClick={this.ok}></button>
        </div>
      )
    );
  }
}

const Input = ({ trim, ...props }) => {
  const [errorMessages, setErrorMessages] = useState([]);

  const validate = (value) => {
    const errors = [];

    for (const validator of props.validators) {
      if (errors.length) {
        // stop validation check if there is an error already
        break;
      }

      if (!validator.validate(value)) {
        errors.push(validator.message());
      }
    }

    setErrorMessages(errors);

    return errors;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run this on first render; run validators in handleChange() afterward
  useEffect(() => validate(props.value), []);

  const handleChange = (event) => {
    const isValid = !validate(event.target.value).length;

    if (isValid) {
      props?.onChange(event.target.value, event);
    }
  };

  return (
    <>
      <input className={cx({ trim })} {...props} onChange={handleChange} />
      {errorMessages.length > 0 && (
        <div className="errors">
          {errorMessages.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}
    </>
  );
};

Input.propTypes = {
  trim: propTypes.bool,
};

const Button = ({ label, primary, waiting, plain, ...props }) => {
  return (
    <button className={cx({ primary, waiting, plain })} {...props}>
      {label}
    </button>
  );
};

Button.propTypes = {
  label: propTypes.string,
  primary: propTypes.bool,
  waiting: propTypes.bool,
  plain: propTypes.bool,
};

const Tooltip = ({ children }) => {
  return <div role="tooltip">{children}</div>;
};

Tooltip.propTypes = {
  children: propTypes.node,
};

export const Icon = ({ interactive, smallest, ...props }) => {
  return <i className={cx({ smallest, interactive })} {...props} />;
};

Icon.propTypes = {
  interactive: propTypes.bool,
  smallest: propTypes.bool,
};

// @see https://github.com/lensapp/lens/blob/master/src/renderer/components/menu/menu.tsx
const MenuItem = ({ children, ...props }) => <li {...props}>{children}</li>;

MenuItem.propTypes = {
  children: childrenPropType,
};

// @see https://github.com/lensapp/lens/blob/master/src/renderer/components/menu/menu.tsx
const Menu = ({ children, ...props }) => <ul {...props}>{children}</ul>;

Menu.proptypes = {
  children: childrenPropType,
};

// renders a trigger icon + a Menu
// @see https://github.com/lensapp/lens/blob/master/src/renderer/components/menu/menu-actions.tsx
const MenuActions = ({ children, id, className, ...props }) => (
  <>
    <Icon material="more_vert" id={id} />
    <Menu htmlFor={id} className={`MenuActions flex ${className || ''}`.trim()}>
      {children}
    </Menu>
  </>
);

MenuActions.proptypes = {
  children: childrenPropType,
  id: propTypes.string,
  className: propTypes.className,
};

// NOTE: in reality, ExtensionStore extends BaseStore, but we don't need to access BaseStore
//  separately anywhere in our code, so the mock just fakes everything in ExtensionStore
class ExtensionStore extends Singleton {
  /**
   * __MOCK ONLY__
   * @type {{ [index: string]: { created: boolean, json: Object } }} map of store name to
   *  object with `created` true if store has been constructed, and `json` being the current
   *  state of the store from "disk"
   */
  static stores = {};

  /**
   * __MOCK ONLY__
   *
   * Initializes a store before it gets created.
   * @param {string} name Store name.
   * @param {Object} json Store state as it would be read from disk by Lens in reality.
   */
  static initStore(name, json) {
    ExtensionStore.stores[name] = { created: false, json };
  }

  constructor({ configName, defaults }) {
    super();

    this.configName = configName;
    this.defaults = defaults;
  }

  loadExtension(extension) {
    if (!ExtensionStore.stores[this.configName]?.created) {
      if (!ExtensionStore.stores[this.configName]) {
        // create store state
        ExtensionStore.stores[this.configName] = {
          created: false,
          json: this.defaults,
        };
      }
    }

    const state = ExtensionStore.stores[this.configName];
    state.created = true;

    // real impl doesn't appear to have any async behavior in it: calls fromStore() immediately
    this.fromStore(state.json);
  }

  fromStore(store) {
    throw new Error('abstract');
  }
}

const createNotification = function (status, message, { timeout = 5000 } = {}) {
  if (!['ok', 'info', 'error'].includes(status)) {
    throw new Error(`Mock: Unsupported notification type "${status}"`);
  }

  const noteEl = document.createElement('div');
  noteEl.className = `notification ${status}`;
  noteEl.innerHTML = `
    <div class="message">${message || ''}</div>
  `;

  document.body.appendChild(noteEl);

  if (timeout > 0) {
    setTimeout(() => document.body.removeChild(noteEl), timeout);
  }
};

const Notifications = {
  ok(message, options) {
    createNotification('ok', message, options);
  },
  info(message, options) {
    createNotification('info', message, options);
  },
  shortInfo(message, options) {
    createNotification('info', message, options);
  },
  error(message, options) {
    createNotification('error', message, options);
  },
};

export const Common = {
  Catalog: {
    KubernetesCluster,
    CatalogEntity,
    CatalogCategory,
    catalogEntities: {
      activeEntity: observable.object({}),
      getItemsForCategory: () => [],
    },
  },
  Store: {
    ExtensionStore,
  },
  Util: {
    Singleton,
    getAppVersion: () => '1.0.0',
    openExternal: (url) => {
      // eslint-disable-next-line no-console
      console.log(`External url: ${url}`);
    },
  },
  logger: {
    // eslint-disable-next-line no-console
    info: console.info,
    // eslint-disable-next-line no-console
    error: console.error,
    // eslint-disable-next-line no-console
    warn: console.warn,
    // eslint-disable-next-line no-console
    log: console.log,
  },
  EventBus: {
    appEventBus: {
      emit: () => {},
    },
  },
};

export const Main = {
  Ipc,
  K8sApi: {
    KubeObject: null,
    K8sApi: {
      forRemoteCluster: jest.fn(() => ({
        list: jest.fn(() => Promise.resolve([])),
        patch: jest.fn(() => Promise.resolve({})),
      })),
      KubeObject: class KubeObject {},
    },
  },
  Catalog: {
    catalogCategories: {
      add: () => () => {},
    },
  },
};

export const Renderer = {
  Ipc,
  Component: {
    Select,
    Spinner,
    Notifications,
    Button,
    Input,
    Tooltip,
    Icon,
    MenuItem,
    Menu,
    MenuActions,
    ConfirmDialog,
  },
  Catalog: {
    KubernetesCluster,
    catalogEntities: {
      activeEntity: observable.object({}),
    },
    catalogCategories: {
      getForGroupKind: () => Common.Catalog.KubernetesCluster,
      add: () => () => {},
    },
  },
  K8sApi: {
    KubeObject: class {},
  },
};
