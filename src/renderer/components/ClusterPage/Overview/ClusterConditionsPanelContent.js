import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { truncate } from 'lodash';
import { layout } from '../../styles';
import * as strings from '../../../../strings';

//
// INTERNAL STYLED COMPONENTS
//

const StatusCircle = styled.span`
  position: absolute;
  top: ${layout.grid * 1.25}px;
  left: 0;
  width: ${layout.grid * 2.5}px;
  height: ${layout.grid * 2.5}px;
  border-radius: ${layout.grid}px;
  display: inline-block;
  background-color: ${({ isErrorState }) =>
    isErrorState ? 'var(--colorError)' : 'var(--colorSuccess)'};
`;

const ConditionsList = styled.ul`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  margin: ${layout.pad * 2.25}px -${layout.pad}px ${layout.pad * 0.75}px;
  li {
    width: calc(100% / 3);
    padding: ${layout.pad * 3.25}px ${layout.pad}px;
  }
  div {
    position: relative;
    padding-left: ${layout.pad * 3}px;
  }
`;

const NoStatusMessage = styled.p`
  padding-top: ${layout.pad * 3}px;
`;

export const ClusterConditionsPanelContent = ({ conditions }) => {
  return (
    <>
      {conditions.length > 0 ? (
        <ConditionsList>
          {conditions.map((condition) => (
            <li key={condition.type}>
              <div>
                <StatusCircle isErrorState={!condition.ready}></StatusCircle>
                <p>
                  <b>{condition.type}</b>
                </p>
                <p>{truncate(condition.message, { length: 250 })}</p>
              </div>
            </li>
          ))}
        </ConditionsList>
      ) : (
        <NoStatusMessage>
          {strings.clusterPage.pages.overview.clusterConditions.noStatus()}
        </NoStatusMessage>
      )}
    </>
  );
};

ClusterConditionsPanelContent.propTypes = {
  conditions: propTypes.array.isRequired,
};
