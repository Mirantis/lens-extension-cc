import { computed, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react';
import React from 'react';
import propTypes from 'prop-types';
import ReactSelect, { components } from 'react-select';
import ReactSelectCreatable from 'react-select/creatable';

const { Menu } = components;

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
    const WrappedMenu = components.Menu ?? Menu;

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

  static creating = '';

  constructor() {
    if (Singleton.creating.length === 0) {
      throw new TypeError('A singleton class must be created by createInstance()');
    }
  }

  /**
   * Creates the single instance of the child class if one was not already created.
   *
   * Multiple calls will return the same instance.
   * Essentially throwing away the arguments to the subsequent calls.
   *
   * Note: this is a racy function, if two (or more) calls are racing to call this function
   * only the first's arguments will be used.
   * @param this Implicit argument that is the child class type
   * @param args The constructor arguments for the child class
   * @returns An instance of the child class
   */
  static createInstance(this, ...args) {
    if (!Singleton.instances.has(this)) {
      if (Singleton.creating.length > 0) {
        throw new TypeError(`Cannot create a second singleton (${this.name}) while creating a first (${Singleton.creating})`);
      }

      try {
        Singleton.creating = this.name;
        Singleton.instances.set(this, new this(...args));
      } finally {
        Singleton.creating = '';
      }
    }

    return Singleton.instances.get(this);
  }

  /**
   * Get the instance of the child class that was previously created.
   * @param this Implicit argument that is the child class type
   * @param strict If false will return `undefined` instead of throwing when an instance doesn't exist.
   * Default: `true`
   * @returns An instance of the child class
   */
  static getInstance(this, strict = true) {
    if (!Singleton.instances.has(this) && strict) {
      throw new TypeError(`instance of ${this.name} is not created`);
    }

    return Singleton.instances.get(this);
  }

  /**
   * Delete the instance of the child class.
   *
   * Note: this doesn't prevent callers of `getInstance` from storing the result in a global.
   *
   * There is *no* way in JS or TS to prevent globals like that.
   */
  static resetInstance() {
    Singleton.instances.delete(this);
  }
}

class Ipc extends Singleton {
  static callbackMap = {};

  static listen = jest.fn().mockImplementation((event, callback) => {
    Ipc.callbackMap[event] = callback;
  });

  static broadcast = jest.fn().mockImplementation((event, payload) => {
    Ipc.callbackMap[event]?.(event, payload);
  });
}

class KubernetesCluster {
  constructor(props) {
    Object.assign(this, props);
  }

  getId() {
    return 'uid';
  }
}

class CatalogEntity {
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

const Button = ({ label, primary, ...props }) => {
  return (
    <button className={primary ? 'primary' : ''} {...props}>
      {label}
    </button>
  );
};

Button.propTypes = {
  label: propTypes.string,
  primary: propTypes.bool,
};

export const Icon = ({ interactive, smallest, ...props }) => {
  const classes = [
    smallest ? 'smallest' : '',
    interactive ? 'interactive' : '',
  ];
  return <i className={classes.join()} {...props} />;
};

Icon.propTypes = {
  interactive: propTypes.bool,
  smallest: propTypes.bool,
}

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
    ExtensionStore: class ExtensionStore extends Singleton {},
  },
  Util: {
    Singleton,
    getAppVersion: () => '1.0.0',
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
    Notifications: {
      error: () => {},
    },
    Button: Button,
    Icon: Icon,
    ConfirmDialog: {
      // eslint-disable-next-line no-undef
      open: jest.fn(),
    },
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
