import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import {
  checkValues,
  TriStateCheckbox,
} from '../TriStateCheckbox/TriStateCheckbox';
import { Accordion } from '../Accordion/Accordion';
import { layout } from '../styles';
import { synchronizeBlock } from '../../../strings';
import {
  useCheckboxes,
  makeCheckboxesInitialState,
} from '../hooks/useCheckboxes';
import { sortNamespaces } from '../EnhancedTable/tableUtil';

const { Button, Icon } = Renderer.Component;

const Content = styled.div(() => ({
  marginTop: layout.gap * 2,
  paddingBottom: layout.gap * 3,
  maxWidth: '750px',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
}));
const TitleWrapper = styled.div(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: layout.pad,
}));

const Projects = styled.div(() => ({
  background: 'var(--secondaryBackground)',
  border: '1px solid',
  borderColor: 'var(--inputControlBorder)',
  borderRadius: 5,
}));

const ProjectsHead = styled.div(() => ({
  display: 'flex',
  alignItems: 'center',
  paddingTop: layout.grid * 4,
  paddingLeft: layout.grid * 9.5,
  paddingRight: layout.grid * 9.5,
  paddingBottom: layout.grid * 2,
  borderBottom: '1px solid',
  borderColor: 'var(--hrColor)',
}));

const ProjectsBody = styled.div(() => ({
  paddingTop: layout.grid * 1.5,
  paddingLeft: layout.grid * 3.25,
  paddingRight: layout.grid * 3.25,
  paddingBottom: layout.grid * 1.5,
}));

const ProjectsList = styled.ul(() => ({
  paddingBottom: layout.grid * 3,
  '& > li:not(:last-of-type)': {
    marginBottom: layout.grid * 2.5,
  },
}));

const AccordionChildrenList = styled.ul(() => ({
  paddingLeft: layout.grid * 13.5,
  paddingRight: layout.grid * 13.5,

  '& > li': {
    paddingTop: layout.grid * 1.5,
    paddingLeft: layout.grid * 5,
    paddingRight: layout.grid * 5,
    paddingBottom: layout.grid * 1.5,
  },

  '& > li:nth-of-type(odd)': {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
}));

const SynchronizeProjectsButtonWrapper = styled.div(() => ({
  marginTop: layout.grid * 4,
}));

const sortIconStyles = {
  color: 'var(--textColorSecondary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
  marginTop: layout.grid / 2,
};

const SortButton = styled.button`
  display: flex;
  background: transparent;
  margin-left: ${layout.grid * 2}px;
  cursor: pointer;
  transform: ${({ isRotated }) =>
    isRotated ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

export const SynchronizeBlock = ({ extendedCloud, onAdd }) => {
  const [syncAll, setSyncAll] = useState(false);
  const { setCheckboxValue, getCheckboxValue, getSyncedData } = useCheckboxes(
    makeCheckboxesInitialState(extendedCloud)
  );

  // @type {object} sorted object of projects
  const [projectsList, setProjectsList] = useState([
    ...(extendedCloud.namespaces || []),
  ]);

  // @type {string} sort by name order
  const [nextSortType, setNextSortType] = useState('');

  if (!projectsList) {
    return null;
  }

  // sort by name initial array with projects
  const sortByName = () => {
    const sorted = [...projectsList].sort((a, b) => {
      if (nextSortType === '' || nextSortType === 'ASC') {
        setNextSortType('DESC');
        return a.name.localeCompare(b.name);
      } else if (nextSortType === 'DESC') {
        setNextSortType('ASC');
        return b.name.localeCompare(a.name);
      }
    });
    setProjectsList(sorted);
  };

  const onSynchronize = () => {
    const { cloud } = extendedCloud;
    const { syncedNamespaces, ignoredNamespaces } = getSyncedData();

    cloud.syncAll = syncAll;
    cloud.updateNamespaces(syncedNamespaces, ignoredNamespaces);

    onAdd(cloud);
  };

  return (
    <Content>
      <TitleWrapper>
        <h3>{synchronizeBlock.title()}</h3>
        <TriStateCheckbox
          label={synchronizeBlock.synchronizeFutureProjects()}
          onChange={() => setSyncAll(!syncAll)}
          value={syncAll ? checkValues.CHECKED : checkValues.UNCHECKED}
        />
      </TitleWrapper>
      <Projects>
        {projectsList.length ? (
          <ProjectsHead>
            <TriStateCheckbox
              label={synchronizeBlock.checkAllCheckboxLabel()}
              onChange={() => setCheckboxValue({ isParent: true })}
              value={getCheckboxValue({ isParent: true })}
            />
            <SortButton
              type="button"
              onClick={sortByName}
              isRotated={nextSortType === 'DESC'}
            >
              <Icon material="arrow_drop_up" style={sortIconStyles} />
            </SortButton>
          </ProjectsHead>
        ) : null}
        <ProjectsBody>
          {!projectsList.length ? (
            synchronizeBlock.noProjectsFound()
          ) : (
            <ProjectsList>
              {sortNamespaces(projectsList).map((namespace) => (
                <li key={namespace.name}>
                  <Accordion
                    title={
                      <TriStateCheckbox
                        value={getCheckboxValue({ name: namespace.name })}
                        label={namespace.name}
                        onChange={() =>
                          setCheckboxValue({ name: namespace.name })
                        }
                      />
                    }
                  >
                    <AccordionChildrenList>
                      <li>
                        <p>
                          {synchronizeBlock.checkboxesDropdownLabels.clusters()}{' '}
                          ({namespace.clusterCount})
                        </p>
                      </li>
                      <li>
                        <p>
                          {synchronizeBlock.checkboxesDropdownLabels.sshKeys()}{' '}
                          ({namespace.sshKeyCount})
                        </p>
                      </li>
                      <li>
                        <p>
                          {synchronizeBlock.checkboxesDropdownLabels.credentials()}{' '}
                          ({namespace.credentialCount})
                        </p>
                      </li>
                    </AccordionChildrenList>
                  </Accordion>
                </li>
              ))}
            </ProjectsList>
          )}
        </ProjectsBody>
      </Projects>
      <SynchronizeProjectsButtonWrapper>
        <Button
          primary
          label={synchronizeBlock.synchronizeButtonLabel()}
          onClick={onSynchronize}
          disabled={!projectsList.length}
        />
      </SynchronizeProjectsButtonWrapper>
    </Content>
  );
};

SynchronizeBlock.propTypes = {
  extendedCloud: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
};
