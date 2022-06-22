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

  static getInstance(_this) {
    return Singleton.instances.get(_this);
  }

  static createInstance(_this, ...args) {
    if (!Singleton.instances.has(this)) {
      Singleton.instances.set(this, new _this(...args));
    }

    return this.getInstance(_this);
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
};

export const Common = {
  Catalog: {
    KubernetesCluster,
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

export const Renderer = {
  Ipc,
  Component: {
    Select,
    Notifications: {
      error: () => {},
    },
    Button: Button,
    Icon: (props) => <i {...props} />,
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
    },
  },
  K8sApi: {
    KubeObject: class {},
  },
};
