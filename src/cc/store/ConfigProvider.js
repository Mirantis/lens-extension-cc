//
// Provides the MCC server's Configuration object
//

import { createContext, useContext, useState, useMemo } from 'react';
import { request } from '../netUtil';
import { ProviderStore } from './ProviderStore';
import { logger } from '../../util';
import * as strings from '../../strings';

//
// Store
//

class ConfigProviderStore extends ProviderStore {
  // @override
  makeNew() {
    return {
      ...super.makeNew(),
      config: null, // {Object} MCC server Configuration object; null if not loaded
    };
  }
}

const pr = new ConfigProviderStore();

//
// Internal Methods
//

/**
 * [ASYNC] Gets the config JSON object at the specified MCC URL.
 * @param {string} url URL to MCC. Must NOT end with a slash.
 */
const _loadConfig = async function getConfig(url) {
  pr.reset(true);

  const res = await request(
    `${url}/config.js`,
    {},
    { extractBodyMethod: 'text' }
  );

  pr.loading = false;
  pr.loaded = true;

  if (res.error) {
    pr.error = res.error;
  } else {
    const content = res.body
      .replace(/^window\.CONFIG\s*=\s*{/, '{')
      .replace('};', '}');

    try {
      pr.store.config = JSON.parse(content);
    } catch (err) {
      logger.error(
        'ConfigProvider._loadConfig()',
        `Failed to parse config, error="${err.message}"`
      );
      if (err.message.match(/^unexpected token/i)) {
        pr.error = strings.configProvider.error.unexpectedToken();
      } else {
        pr.error = err.message;
      }
    }
  }

  pr.notifyIfError();
  pr.onChange();
};

//
// Provider Definition
//

const ConfigContext = createContext();

export const useConfig = function () {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within an ConfigProvider');
  }

  // NOTE: `context` is the value of the `value` prop we set on the
  //  <ConfigContext.Provider value={...}/> we return as the <ConfigProvider/>
  //  component to wrap all children that should have access to the state (i.e.
  //  all the children that will be able to `useConfig()` to access the state)
  const [state] = context;

  // this is what you actually get from `useConfig()` when you consume it
  return {
    state,

    //// ACTIONS

    actions: {
      /**
       * [ASYNC] Loads the MCC Configuration object.
       * @param {string} url MCC URL. Must NOT end with a slash.
       */
      load(url) {
        if (!pr.loading) {
          _loadConfig(url);
        }
      },

      /** Resets store state. Data will need to be reloaded. */
      reset() {
        if (!pr.loading) {
          pr.reset();
        }
      },
    },
  };
};

export const ConfigProvider = function (props) {
  // NOTE: since the state is passed directly (by reference) into the context
  //  returned by the provider, even the initial state should be a clone of the
  //  `store` so that we consistently return a `state` property (in the context)
  //  that is a shallow clone of the `store`
  const [state, setState] = useState(pr.clone());
  const value = useMemo(() => [state, setState], [state]);

  pr.setState = setState;

  return <ConfigContext.Provider value={value} {...props} />;
};
