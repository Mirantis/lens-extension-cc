import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { layout } from '../../styles';
import * as strings from '../../../../strings';
import { PanelTitle } from '../PanelTitle';
import { DrawerTitleWrapper } from '../clusterPageComponents';

//
// INTERNAL STYLED COMPONENTS
//

const Container = styled.div`
  padding-bottom: ${layout.grid * 6}px;
  padding-left: ${layout.grid * 6}px;
  padding-right: ${layout.grid * 6}px;
  background-color: var(--contentColor);
`;

const StatusCircle = styled.span`
  position: absolute;
  top: ${layout.grid * 1.25}px;
  left: 0;
  width: ${layout.grid * 2.5}px;
  height: ${layout.grid * 2.5}px;
  border-radius: ${layout.grid}px;
  display: inline-block;
  background-color: ${({ isErrorState }) =>
    isErrorState ? 'var(--colorWarning)' : 'var(--colorSuccess)'};
`;

const ConditionsList = styled.ul`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin: ${layout.pad * 2.25}px -${layout.pad}px ${layout.pad * 0.75}px;

  li {
    width: 100%;
    padding: ${layout.pad * 3.25}px ${layout.pad}px;

    @media (min-width: 768px) {
      width: 50%;
    }

    @media (min-width: 1400px) {
      width: calc(100% / 3);
    }
  }

  div {
    position: relative;
    padding-left: ${layout.pad * 3}px;
  }
`;

const TruncatedText = styled.p`
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const NoStatusMessage = styled.p`
  padding-top: ${layout.pad * 3}px;
`;

//
// HELPERS
//
const sortByAsc = (a, b) => {
  return a.type.localeCompare(b.type);
};

export const ConditionsPanel = ({ clusterEntity }) => {
  const conditions = clusterEntity.spec.conditions || [];

  return (
    <>
      <DrawerTitleWrapper>
        <PanelTitle
          title={strings.clusterPage.pages.overview.clusterConditions.title()}
        />
      </DrawerTitleWrapper>
      <Container>
        {conditions.length > 0 ? (
          <ConditionsList>
            {conditions
              .concat()
              .sort(sortByAsc)
              .map((condition) => (
                <li key={condition.type}>
                  <div>
                    <StatusCircle
                      isErrorState={!condition.ready}
                    ></StatusCircle>
                    <p>
                      <b>{condition.type}</b>
                    </p>
                    <TruncatedText>{condition.message}</TruncatedText>
                  </div>
                </li>
              ))}
          </ConditionsList>
        ) : (
          <NoStatusMessage>
            {strings.clusterPage.pages.overview.clusterConditions.noStatus()}
          </NoStatusMessage>
        )}
      </Container>
    </>
  );
};

ConditionsPanel.propTypes = {
  clusterEntity: propTypes.object.isRequired,
};
