import { render, screen } from 'testingUtility';
import { SummaryPanelContent } from '../SummaryPanelContent';
import * as strings from '../../../../../strings';
import * as consts from '../../../../../constants';

const createTestEntity = (provider, isMgmtCluster) => {
  return {
    metadata: {
      cloudUrl: 'test-cloud-url',
      namespace: 'test-namespace',
      name: 'test-name',
      syncedAt: '2011-10-05T14:48:00.000Z',
      labels: {
        credential: 'test-credential-label',
        'ssh-key': '',
        license: '',
        proxy: '',
      },
    },
    spec: {
      provider,
      isMgmtCluster: isMgmtCluster ?? true,
      currentVersion: '112233',
    },
    status: {
      phase: 'test-phase',
    },
  };
};

describe('/renderer/components/ClusterPage/Overview/SummaryPanelContent', () => {
  const invalidProvider = 'invalid-provider';

  [
    consts.providerTypes.AWS,
    consts.providerTypes.AZURE,
    consts.providerTypes.BYO,
    consts.providerTypes.EQUINIX,
    consts.providerTypes.OPENSTACK,
    consts.providerTypes.VSPHERE,
    invalidProvider,
  ].forEach((provider) => {
    it(`renders an summary panel with |${provider}| provider, isMgmtCluster=|true|`, () => {
      render(
        <SummaryPanelContent clusterEntity={createTestEntity(provider)} />
      );

      if (provider === invalidProvider) {
        expect(
          screen.getByText(
            strings.catalog.entities.common.details.unknownValue()
          )
        ).toBeInTheDocument();
      } else {
        expect(screen.getByText(provider)).toBeInTheDocument();
      }

      expect(
        screen.queryByText('test-credential-label')
      ).not.toBeInTheDocument();
    });
  });

  it('renders an summary panel, isMgmtCluster=|false|', () => {
    render(
      <SummaryPanelContent
        clusterEntity={createTestEntity('invalidProvider', false)}
      />
    );

    expect(screen.getByText('test-credential-label')).toBeInTheDocument();
  });
});
