import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { Checkbox } from '../Checkbox/Checkbox';
import { Accordion } from '../Accordion/Accordion';
import { layout } from '../styles';
import { synchronizeBlock } from '../../../strings';

const { Component } = Renderer;

const Content = styled.div(() => ({
  marginTop: layout.gap * 2,
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

const mockedProjects = [
  {
    projectName: 'imc-pm-team (Default)',
    children: [
      {
        title: 'clusters (23)',
      },
      {
        title: 'ssh keys (8)',
      },
      {
        title: 'credentials (12)',
      },
    ],
  },
  {
    projectName: 'test-project',
    children: [
      {
        title: 'clusters (21)',
      },
      {
        title: 'ssh keys (12)',
      },
    ],
  },
  {
    projectName: 'ceph project',
    children: [
      {
        title: 'clusters (25)',
      },
      {
        title: 'ssh keys (19)',
      },
      {
        title: 'credentials (4)',
      },
    ],
  },
  {
    projectName: 'mcc-management-team',
    children: [
      {
        title: 'clusters (15)',
      },
      {
        title: 'ssh keys (11)',
      },
      {
        title: 'credentials (6)',
      },
    ],
  },
];

export const SynchronizeBlock = ({ extCloud }) => {
  // @type {object} sorted object of projects
  const [projectsList, setProjectsList] = useState(mockedProjects);

  // @type {string} sort by name order
  const [nextSortType, setNextSortType] = useState('');

  // @type {object}
  const [currentCheckboxState, setCurrentCheckboxState] = useState({
    parent: false,
    children: new Array(projectsList.length).fill(false),
  });

  // sort by name initial array with projects
  const sortByName = () => {
    const sorted = [...projectsList].sort((a, b) => {
      if (nextSortType === '' || nextSortType === 'ASC') {
        setNextSortType('DESC');
        return a.projectName.localeCompare(b.projectName);
      } else if (nextSortType === 'DESC') {
        setNextSortType('ASC');
        return b.projectName.localeCompare(a.projectName);
      }
    });
    setProjectsList(sorted);
  };

  // set parent checkbox state based on changes of children checkboxes
  const setParentCheckboxState = (childrenCheckboxes) => {
    let result = currentCheckboxState.parent;
    if (
      childrenCheckboxes.every((el) => el === false) ||
      childrenCheckboxes.every((el) => el === true)
    ) {
      result = childrenCheckboxes[0];
    } else if (
      childrenCheckboxes.some((el) => el === false) &&
      childrenCheckboxes.some((el) => el === true)
    ) {
      result = true;
    }
    return result;
  };

  const onChangeHandler = (index) => {
    if (isNaN(index)) {
      setCurrentCheckboxState({
        ...currentCheckboxState,
        parent: !currentCheckboxState.parent,
        children: currentCheckboxState.children.map(
          (el) => (el = !currentCheckboxState.parent)
        ),
      });
    } else {
      const modifiedChildrenCheckboxes = currentCheckboxState.children.map(
        (el, i) => (index === i ? (el = !el) : el)
      );
      setCurrentCheckboxState({
        ...currentCheckboxState,
        children: modifiedChildrenCheckboxes,
        parent: setParentCheckboxState(modifiedChildrenCheckboxes),
      });
    }
  };

  return (
    <Content>
      <Title>{synchronizeBlock.title()}</Title>
      <Projects>
        <ProjectsHead>
          <Checkbox
            label={synchronizeBlock.checkAllCheckboxLabel()}
            onChange={() => onChangeHandler()}
            isCheckedFromParent={currentCheckboxState.parent}
            isMinusIcon={
              currentCheckboxState.children.some((el) => el === false) &&
              currentCheckboxState.children.some((el) => el === true)
            }
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
            {projectsList.map((project, index) => (
              <li key={project.projectName}>
                <Accordion
                  title={
                    <Checkbox
                      isCheckedFromParent={currentCheckboxState.children[index]}
                      label={project.projectName}
                      onChange={() => onChangeHandler(index)}
                    />
                  }
                >
                  <AccordionChildrenList>
                    {project.children.map((child, i) => (
                      <li key={i}>
                        <p>{child.title}</p>
                      </li>
                    ))}
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
  extCloud: {},
};
