import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import {
  TriStateCheckbox,
  checkValues,
} from '../TriStateCheckbox/TriStateCheckbox';
import { Accordion } from '../Accordion/Accordion';
import { layout } from '../styles';
import { synchronizeBlock } from '../../../strings';

const { Notifications, Button, Icon } = Renderer.Component;

// Mocked cloud data
import { mockExtCloud } from '../../../../test/mocks/mockExtCloud';

const Content = styled.div(() => ({
  marginTop: layout.gap * 2,
  paddingBottom: layout.gap * 3,
  maxWidth: '750px',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
}));

const Title = styled.h3(() => ({
  marginBottom: layout.pad,
  alignSelf: 'start',
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
  paddingBottom: layout.grid * 4.5,
}));

const ProjectsList = styled.ul(() => ({
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

const SortButton = styled.button`
  display: flex;
  background: transparent;
  margin-left: ${layout.grid * 2}px;
  cursor: pointer;
  transform: ${({ isRotated }) =>
    isRotated ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

export const SynchronizeBlock = ({
  extendedCloud,
  onAdd,
  checkBoxChangeHandler,
  parentCheckboxValue,
  childrenCheckboxValue,
}) => {
  // @type {object} sorted object of projects
  const [projectsList, setProjectsList] = useState(extendedCloud.namespaces);

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
    const allNamespaces = extendedCloud.namespaces.map(({ name }) => name);
    const namespaces = allNamespaces.filter(
      (name) => childrenCheckboxValue(name) === checkValues.CHECKED
    );

    if (!namespaces.length) {
      Notifications.error(synchronizeBlock.error.noProjects());
      return;
    }

    if (allNamespaces.length === namespaces.length) {
      cloud.syncNamespaces = [];
      cloud.syncAll = true;
    } else {
      cloud.syncAll = false;
      cloud.syncNamespaces = namespaces;
    }

    onAdd(cloud);
  };

  return (
    <Content>
      <Title>{synchronizeBlock.title()}</Title>
      <Projects>
        <ProjectsHead>
          <TriStateCheckbox
            label={synchronizeBlock.checkAllCheckboxLabel()}
            onChange={() => checkBoxChangeHandler(false)}
            value={parentCheckboxValue}
          />
          <SortButton
            type="button"
            onClick={sortByName}
            isRotated={nextSortType === 'DESC'}
          >
            <Icon
              material="arrow_drop_up"
              style={{
                color: 'var(--textColorSecondary)',
                fontSize: 'calc(var(--font-size) * 1.8)',
                marginTop: layout.grid / 2,
              }}
            />
          </SortButton>
        </ProjectsHead>
        <ProjectsBody>
          <ProjectsList>
            {projectsList.map((namespace) => (
              <li key={namespace.name}>
                <Accordion
                  title={
                    <TriStateCheckbox
                      value={childrenCheckboxValue(namespace.name)}
                      label={namespace.name}
                      onChange={() => checkBoxChangeHandler(namespace.name)}
                    />
                  }
                >
                  <AccordionChildrenList>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.clusters()} (
                        {namespace.clusterCount})
                      </p>
                    </li>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.sshKeys()} (
                        {namespace.sshKeyCount})
                      </p>
                    </li>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.credentials()}{' '}
                        ({namespace.credentials.allCredentialsCount})
                      </p>
                    </li>
                  </AccordionChildrenList>
                </Accordion>
              </li>
            ))}
          </ProjectsList>
        </ProjectsBody>
      </Projects>
      <SynchronizeProjectsButtonWrapper>
        <Button
          primary
          label={synchronizeBlock.synchronizeButtonLabel()}
          onClick={onSynchronize}
        />
      </SynchronizeProjectsButtonWrapper>
    </Content>
  );
};

SynchronizeBlock.propTypes = {
  extendedCloud: PropTypes.object,
  onAdd: PropTypes.func.isRequired,
  checkBoxChangeHandler: PropTypes.func,
  parentCheckboxValue: PropTypes.string,
  childrenCheckboxValue: PropTypes.func,
};

SynchronizeBlock.defaultProps = {
  extCloud: mockExtCloud,
  checkBoxChangeHandler: () => {},
  parentCheckboxValue: '',
  childrenCheckboxValue: () => {},
};
