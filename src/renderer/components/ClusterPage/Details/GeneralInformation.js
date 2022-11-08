import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import * as strings from '../../../../strings';
import { layout } from '../../styles';
import { formatDate } from '../../../rendererUtil';
import { PanelTitle } from '../PanelTitle';
import { DrawerTitleWrapper } from '../ClusterPage';

const {
  Component: { DrawerItem },
} = Renderer;

const {
  catalog: {
    entities: {
      common: {
        details: { unknownValue },
      },
    },
  },
} = strings;

//
// INTERNAL STYLED COMPONENTS
//

const Container = styled.td(() => ({
  display: 'flex',
  paddingLeft: layout.pad * 3,
  paddingRight: layout.pad * 3,
  paddingBottom: layout.pad * 2.25,
  backgroundColor: 'var(--contentColor)',

  '& > div:first-of-type': {
    width: '45%',
  },

  '& > div:last-of-type': {
    width: '55%',
  },

  '.DrawerItem': {
    paddingTop: layout.pad * 1.5,
    paddingBottom: layout.pad * 1.5,
  },
}));

const LabelsWrapper = styled.div(() => ({
  display: 'flex',
  overflowX: 'auto',

  '&::-webkit-scrollbar': {
    display: 'none',
  },

  span: {
    minWidth: 'fit-content',
    marginRight: layout.grid,
  },
}));

const ServerStatus = styled.p`
  color: var(--colorSuccess);
  color: ${({ isReady }) =>
    isReady ? 'var(--colorSuccess)' : 'var(--textColorPrimary)'};
`;

//
// MAIN COMPONENT
//

export const GeneralInformation = ({ clusterEntity }) => {
  //
  // RENDER
  //

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.details.generalInformation.title()}
        />
      </DrawerTitleWrapper>
      <Container>
        <div>
          <DrawerItem
            name={strings.clusterPage.pages.details.generalInformation.name()}
          >
            {clusterEntity.metadata.name || unknownValue()}
          </DrawerItem>
          <DrawerItem
            name={strings.clusterPage.pages.details.generalInformation.kind()}
          >
            {clusterEntity.kind}
          </DrawerItem>
          <DrawerItem
            name={strings.clusterPage.pages.details.generalInformation.source()}
          >
            {clusterEntity.metadata.source || unknownValue()}
          </DrawerItem>
        </div>
        <div>
          <DrawerItem
            name={strings.clusterPage.pages.details.generalInformation.status()}
          >
            <ServerStatus isReady={clusterEntity.spec.apiStatus === 'Ready'}>
              {clusterEntity.spec.apiStatus || unknownValue()}
            </ServerStatus>
          </DrawerItem>
          <DrawerItem
            name={strings.clusterPage.pages.details.generalInformation.lastSync()}
          >
            {formatDate(clusterEntity.metadata.syncedAt)}
          </DrawerItem>
          <DrawerItem
            name={strings.clusterPage.pages.details.generalInformation.labels()}
          >
            <LabelsWrapper>
              {Object.keys(clusterEntity.metadata.labels).length > 0
                ? Object.keys(clusterEntity.metadata.labels).map(
                    (entity, index) => (
                      <span key={entity}>
                        {entity}={clusterEntity.metadata.labels[`${entity}`]}
                        {index <
                        Object.keys(clusterEntity.metadata.labels).length - 1
                          ? ','
                          : ''}
                      </span>
                    )
                  )
                : strings.clusterPage.common.emptyValue()}
            </LabelsWrapper>
          </DrawerItem>
        </div>
      </Container>
    </>
  );
};

GeneralInformation.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
