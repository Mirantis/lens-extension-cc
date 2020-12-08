//
// Preferences Panel
//

import React, { useState, useEffect } from 'react';
import os from 'os';
import styled from '@emotion/styled';
import { remote } from 'electron';
import { Component } from '@k8slens/extensions';
import { useExtState } from './store/ExtStateProvider';
import { useAddClusters } from './store/AddClustersProvider';
import { Section as BaseSection } from './Section';
import { layout } from './styles';
import * as strings from '../strings';

const Section = styled(BaseSection)(function ({ offline }) {
  return {
    small: {
      marginTop: -(layout.gap - layout.grid),
    },

    '.lecc-PreferencesPanel--offline-hint': {
      opacity: offline ? 1.0 : 0.5,
    },
  };
});

const Title = styled.div(function () {
  return {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
});

const SavePath = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'center',

    'div.Input': {
      flex: 1,
      marginRight: layout.pad,
    },

    '.lecc-PreferencesPanel--folder-icon': {
      flex: 'none',
    },
  };
});

const SavedIndicator = styled.div(function () {
  return {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--colorSuccess)',

    p: {
      marginLeft: layout.grid,
    },
  };
});

export const PreferencesPanel = function () {
  //
  // STATE
  //

  const {
    state: { savePath, offline, addToNew },
    actions: extActions,
  } = useExtState();

  const {
    state: { loading: addingClusters },
  } = useAddClusters();

  const [showSaved, setShowSaved] = useState(false);

  //
  // EVENTS
  //

  const handleBrowseClick = async function () {
    const { dialog, BrowserWindow } = remote;
    const { canceled, filePaths } = await dialog.showOpenDialog(
      BrowserWindow.getFocusedWindow(),
      {
        defaultPath: savePath,
        properties: ['openDirectory', 'createDirectory', 'showHiddenFiles'],
        message: strings.preferencesPanel.location.message(),
        buttonLabel: strings.preferencesPanel.location.action(),
      }
    );

    if (!canceled && filePaths.length > 0) {
      extActions.setSavePath(filePaths[0]);
      setShowSaved(true);
    }
  };

  const handleSavePathChange = function (value) {
    extActions.setSavePath(value);
    setShowSaved(true);
  };

  const handleSavePathBlur = function () {
    const newPath = savePath.replace('~', os.homedir());
    if (newPath !== savePath) {
      extActions.setSavePath(newPath);
      setShowSaved(true);
    }
  };

  const handleAddToNewChange = function (checked) {
    extActions.setAddToNew(checked);
    setShowSaved(true);
  };

  const handleOfflineChange = function (checked) {
    extActions.setOffline(checked);
    setShowSaved(true);
  };

  //
  // EFFECTS
  //

  useEffect(
    function () {
      if (showSaved) {
        let timerId = setTimeout(function () {
          timerId = undefined;
          setShowSaved(false);
        }, 3000);

        return function () {
          if (timerId) {
            clearTimeout(timerId);
          }
        };
      }
    },
    [showSaved]
  );

  //
  // RENDER
  //

  return (
    <Section className="lecc-PreferencesPanel" offline={offline}>
      <Title>
        <h2>{strings.preferencesPanel.title()}</h2>
        {showSaved && (
          <SavedIndicator>
            <Component.Icon material="check_circle" />
            <p>{strings.preferencesPanel.saved()}</p>
          </SavedIndicator>
        )}
      </Title>

      <SavePath>
        <Component.Input
          type="text"
          theme="round-black" // borders on all sides, rounded corners
          value={savePath}
          disabled={addingClusters}
          readOnly
          onChange={handleSavePathChange}
          onBlur={handleSavePathBlur}
        />
        <Component.Icon
          className="lecc-PreferencesPanel--folder-icon"
          material="folder"
          disabled={addingClusters}
          onClick={handleBrowseClick}
          tooltip={strings.preferencesPanel.location.icon()}
        />
      </SavePath>
      <small className="hint">{strings.preferencesPanel.location.tip()}</small>

      <Component.Checkbox
        label={strings.preferencesPanel.addToNew.label()}
        disabled={addingClusters}
        value={addToNew}
        onChange={handleAddToNewChange}
      />
      <small className="lecc-PreferencesPanel--addToNew-hint hint">
        {addToNew
          ? strings.preferencesPanel.addToNew.tipOn()
          : strings.preferencesPanel.addToNew.tipOff()}
      </small>

      <Component.Checkbox
        label={strings.preferencesPanel.offline.label()}
        disabled={addingClusters}
        value={offline}
        onChange={handleOfflineChange}
      />
      <small className="lecc-PreferencesPanel--offline-hint hint">
        {strings.preferencesPanel.offline.tip()}
      </small>
    </Section>
  );
};
