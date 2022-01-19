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

const { Component } = Renderer;

// Mocked cloud data
import { mockExtCloud } from '../../../../test/mocks/mockExtCloud';

const { Component } = Renderer;

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

const checkboxesStateObj = (extCloud) => {
  return extCloud.namespaces.reduce((acc, namespace) => {
    acc[namespace.name] = false;
    return acc;
  }, {});
};

export const SynchronizeBlock = ({ extCloud }) => {
  // @type {object} sorted object of projects
  const [projectsList, setProjectsList] = useState(extCloud.namespaces);

  // @type {string} sort by name order
  const [nextSortType, setNextSortType] = useState('');

  // @type {object} checkboxes state
  const [сheckboxesState, setCheckboxesState] = useState({
    parent: false,
    children: checkboxesStateObj(extCloud),
  });

  if (!projectsList) {
    return null;
  }

  const values = {
    CHECKED: 'CHECKED',
    UNCHECKED: 'UNCHECKED',
    MIXED: 'MIXED',
  };

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

  // set parent checkbox state based on changes of children checkboxes
  const setParentCheckboxState = (children) => {
    const childrenCheckboxes = Object.values(children);

    if (
      childrenCheckboxes.every((el) => el === false) ||
      childrenCheckboxes.every((el) => el === true)
    ) {
      return childrenCheckboxes[0];
    }
    if (childrenCheckboxes.some((el) => el === false)) {
      return true;
    }
    return сheckboxesState.parent;
  };

  const getNewChildren = (parentCheckedStatus) => {
    const newChildren = { ...сheckboxesState.children };

    Object.keys(сheckboxesState.children).forEach((name) => {
      newChildren[name] = parentCheckedStatus;
    });
    return newChildren;
  };

  const onChangeHandler = (name) => {
    if (!name) {
      setCheckboxesState({
        parent: !сheckboxesState.parent,
        children: getNewChildren(!сheckboxesState.parent),
      });
    } else {
      const newChildren = { ...сheckboxesState.children };
      newChildren[name] = !сheckboxesState.children[name];

      setCheckboxesState({
        children: newChildren,
        parent: setParentCheckboxState(newChildren),
      });
    }
  };

  const parentCheckboxValue = () => {
    const childrenCheckboxes = Object.values(сheckboxesState.children);

    if (
      сheckboxesState.parent &&
      childrenCheckboxes.some((el) => el === false) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      return checkValues.MIXED;
    }
    if (сheckboxesState.parent) {
      return checkValues.CHECKED;
    } else {
      return checkValues.UNCHECKED;
    }
  };

  const childrenCheckboxValue = (name) => {
    return сheckboxesState.children[name]
      ? checkValues.CHECKED
      : checkValues.UNCHECKED;
  };

  return (
    <Content>
      <Title>{synchronizeBlock.title()}</Title>
      <Projects>
        <ProjectsHead>
          <TriStateCheckbox
            label={synchronizeBlock.checkAllCheckboxLabel()}
            onChange={() => onChangeHandler()}
            value={parentCheckboxValue()}
          />
          <SortButton
            type="button"
            onClick={sortByName}
            isRotated={nextSortType === 'DESC' ? true : false}
          >
            <Component.Icon
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
                      onChange={() => onChangeHandler(namespace.name)}
                    />
                  }
                >
                  <AccordionChildrenList>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.clusters()} (
                        {namespace.clustersCount})
                      </p>
                    </li>
                    <li>
                      <p>
                        {synchronizeBlock.checkboxesDropdownLabels.sshKeys()} (
                        {namespace.sshKeysCount})
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
        <Component.Button
          primary
          label={synchronizeBlock.synchronizeButtonLabel()}
        />
      </SynchronizeProjectsButtonWrapper>
    </Content>
  );
};

SynchronizeBlock.propTypes = {
  extCloud: PropTypes.object,
};

SynchronizeBlock.defaultProps = {
  extCloud: mockExtCloud,
};
