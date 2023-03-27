import { useState, useMemo, useCallback } from 'react';
import propTypes from 'prop-types';
import * as rtv from 'rtvjs';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { Modal } from '../Modal/Modal';
import { Cloud } from '../../../common/Cloud';
import { openBrowser } from '../../../util/netUtil';
import { InlineNotice, types as noticeTypes } from '../InlineNotice';
import {
  TriStateCheckbox,
  checkValues,
} from '../TriStateCheckbox/TriStateCheckbox';
import { getCloudConnectionError } from '../../rendererUtil';
import * as strings from '../../../strings';

const { Icon, Tooltip } = Renderer.Component;

//
// STYLED COMPONENTS
//

const ConnectionError = styled.div(() => ({
  marginLeft: layout.grid,
}));

const StyledCheckList = styled.ul(() => ({
  display: 'flex',
  flexDirection: 'column',

  marginTop: layout.pad,
  padding: layout.pad,
  backgroundColor: 'var(--settingsBackground)',
  borderRadius: layout.grid,
  listStyle: 'none',

  '> li': {
    display: 'flex',
    alignItems: 'center',
    marginBottom: layout.pad,
  },
  '> li:last-of-type': {
    marginBottom: 0,
  },
}));

const StyledModal = styled(Modal)(() => ({
  '.cclex-modal-body': {
    '[data-cclex-component="InlineNotice"]': {
      marginBottom: layout.gap,
    },

    p: {
      marginBottom: layout.pad,

      a: {
        color: 'var(--primary)',
        textDecoration: 'underline',
      },
    },
    'p:last-of-type': {
      marginBottom: 0,
    },
  },
}));

//
// COMPONENT
//

// TODO[CCLEX-196]: DEPRECATED, remove for next major
export const TrustHostModal = function ({ clouds, onSave, onCancel, onClose }) {
  //
  // VERIFY
  //

  if (DEV_ENV) {
    // PERFORMANCE: only verify props when they change
    // eslint-disable-next-line react-hooks/rules-of-hooks -- DEV_ENV never changes at runtime
    useMemo(
      function () {
        // assert some required props in Dev builds (in part because prop-types
        //  considers an empty string as valid for a required string prop)
        DEV_ENV &&
          rtv.verify(
            { props: { clouds } },
            {
              props: {
                clouds: [
                  rtv.ARRAY,
                  {
                    min: 1,
                    $: [
                      rtv.CLASS_OBJECT,
                      { ctor: Cloud },
                      (cloud) => {
                        if (cloud.trustHost) {
                          throw new Error(
                            `Cloud "${cloud.cloudUrl}" is already trusted`
                          );
                        }
                      },
                    ],
                  },
                ],
              },
            }
          );
      },
      [clouds]
    );
  }

  //
  // STATE
  //

  const [trustedHosts, setTrustedHosts] = useState(
    clouds.reduce(
      (map, cloud) => ({
        ...map,
        [cloud.cloudUrl]: cloud.trustHost, // initially should be false for all clouds per VERIFY above
      }),
      {}
    )
  );

  //
  // EVENTS
  //

  const handleNewFeatureClick = useCallback((event) => {
    if (event.target.tagName === 'A') {
      event.preventDefault();
      if (event.target.href.endsWith('#1')) {
        openBrowser(
          'https://github.com/Mirantis/lens-extension-cc#trusted-hosts'
        );
      }
    }
  }, []);

  const handleTrustCloudChange = useCallback(
    function (event, { checked, data: cloud }) {
      setTrustedHosts({
        ...trustedHosts,
        [cloud.cloudUrl]: checked,
      });
    },
    [trustedHosts]
  );

  const handleCallClick = useCallback(
    function (event) {
      if (typeof onSave === 'function') {
        onSave(event, { trustedHosts });
      }
    },
    [onSave, trustedHosts]
  );

  //
  // EFFECTS
  //

  //
  // RENDER
  //

  return (
    <StyledModal
      title={strings.syncView.trustHostModal.title()}
      callAction={{
        label: strings.syncView.trustHostModal.callLabel(),
        onClick: handleCallClick,
      }}
      cancelAction={{
        onClick: onCancel,
      }}
      onClose={onClose}
    >
      <InlineNotice type={noticeTypes.WARNING}>
        <p
          dangerouslySetInnerHTML={{
            __html: strings.syncView.trustHostModal.deprecationHtml(),
          }}
        />
      </InlineNotice>
      <p
        dangerouslySetInnerHTML={{
          __html: strings.syncView.trustHostModal.newfeatureHtml(),
        }}
        onClick={handleNewFeatureClick}
      />
      <p
        dangerouslySetInnerHTML={{
          __html: strings.syncView.trustHostModal.promptHtml(),
        }}
      />
      <StyledCheckList>
        {clouds.map((cloud) => (
          <li key={cloud.name}>
            <TriStateCheckbox
              data={cloud}
              label={`${cloud.name} (${cloud.cloudUrl})`}
              value={
                trustedHosts[cloud.cloudUrl]
                  ? checkValues.CHECKED
                  : checkValues.UNCHECKED
              }
              onChange={handleTrustCloudChange}
            />
            {cloud.connectError ? (
              <ConnectionError>
                <Icon
                  id={`${cloud.name}-untrusted-cloud-connection-error`}
                  material="error"
                  focusable={false}
                  interactive={false}
                  style={{ color: 'var(--colorError)' }}
                />
                <Tooltip
                  targetId={`${cloud.name}-untrusted-cloud-connection-error`}
                >
                  {getCloudConnectionError(cloud)}
                </Tooltip>
              </ConnectionError>
            ) : null}
          </li>
        ))}
      </StyledCheckList>
    </StyledModal>
  );
};

TrustHostModal.propTypes = {
  clouds: propTypes.arrayOf(propTypes.instanceOf(Cloud)), // untrusted clouds

  // Signature: `(event: MouseEvent|KeyboardEvent, info: { trustedHosts: Record<string,true> }) => void`
  // - `info.trustedHosts`: Map of Cloud URL to `true` for those that should be trusted, `false`
  //     for those that should not. Empty map if none.
  onSave: propTypes.func,

  // Signature: `(event: MouseEvent|KeyboardEvent) => void`
  onCancel: propTypes.func,

  // Signature: `() => void`
  onClose: propTypes.func,
};
