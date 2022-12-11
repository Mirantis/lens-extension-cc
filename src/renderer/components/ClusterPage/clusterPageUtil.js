import styled from '@emotion/styled';
import * as consts from '../../../constants';
import * as strings from '../../../strings';
import { layout } from '../styles';
import { AwsIcon } from './icons/AwsIcon';
import { AzureIcon } from './icons/AzureIcon';
import { ByoIcon } from './icons/ByoIcon';
import { EquinixIcon } from './icons/EquinixIcon';
import { OpenstackIcon } from './icons/OpenstackIcon';
import { VsphereIcon } from './icons/VsphereIcon';
import { IpcRenderer } from '../../IpcRenderer';

const {
  catalog: {
    entities: {
      common: {
        details: { unknownValue },
      },
    },
  },
} = strings;

const ProviderWrapper = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
}));

const IconWrapper = styled.div(() => ({
  display: 'inline-block',
  marginRight: layout.grid * 3,
}));

/**
 * Returns provider icon depends on it name.
 * @param {string} provider Provider name.
 * @returns {ReactElement} Provider icon.
 */
export const getProvider = (provider) => {
  switch (provider) {
    case consts.providerTypes.AWS:
      return (
        <ProviderWrapper>
          <IconWrapper>
            <AwsIcon size={28} fill="var(--textColorPrimary)" />
          </IconWrapper>
        </ProviderWrapper>
      );
    case consts.providerTypes.AZURE:
      return (
        <ProviderWrapper>
          <IconWrapper>
            <AzureIcon size={19} fill="var(--textColorPrimary)" />
          </IconWrapper>
        </ProviderWrapper>
      );
    case consts.providerTypes.BYO:
      return (
        <ProviderWrapper>
          <IconWrapper>
            <ByoIcon size={30} fill="var(--textColorPrimary)" />
          </IconWrapper>
        </ProviderWrapper>
      );
    case consts.providerTypes.EQUINIX:
      return (
        <ProviderWrapper>
          <IconWrapper>
            <EquinixIcon size={28} fill="var(--textColorPrimary)" />
          </IconWrapper>
        </ProviderWrapper>
      );
    case consts.providerTypes.OPENSTACK:
      return (
        <ProviderWrapper>
          <IconWrapper>
            <OpenstackIcon size={20} fill="var(--textColorPrimary)" />
          </IconWrapper>
        </ProviderWrapper>
      );
    case consts.providerTypes.VSPHERE:
      return (
        <ProviderWrapper>
          <IconWrapper>
            <VsphereIcon size={43} fill="var(--textColorPrimary)" />
          </IconWrapper>
        </ProviderWrapper>
      );
    default:
      return unknownValue();
  }
};

/**
 * Starts cloud sync.
 * @param {string} cloudUrl Cloud url to sync.
 */
export const handleCloudSync = (cloudUrl) => {
  IpcRenderer.getInstance().invoke(consts.ipcEvents.invoke.SYNC_NOW, cloudUrl);
};
