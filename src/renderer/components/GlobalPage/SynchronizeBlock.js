import { useState } from 'react';
import styled from '@emotion/styled';
import { Renderer } from '@k8slens/extensions';
import { Checkbox } from '../Checkbox/Checkbox';
import { Accordion } from '../Accordion/Accordion';
import { layout } from '../styles';
import { synchronizeBlock } from '../../../strings';
import { CaretIcon } from './CaretIcon';

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
  paddingLeft: layout.grid * 2.5,
  paddingRight: layout.grid * 2.5,
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
  margin-left: ${layout.grid * 2};
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

export const SynchronizeBlock = () => {
  // @type {boolean} states of all checkbox
  const [isAllChecked, setIsAllChecked] = useState(false);

  // @type {object} sorted object of projects
  const [projectsList, setProjectsList] = useState(mockedProjects);

  // @type {string} sort by name order
  const [nextSortType, setNextSortType] = useState('');

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

  // get state of child checkbox
  const handleChildCheckbox = (value) => {
    setIsAllChecked(value);
  };

  return (
    <Content>
      <Title>{synchronizeBlock.title()}</Title>
      <Projects>
        <ProjectsHead>
          <Checkbox
            handleChildCheckbox={handleChildCheckbox}
            label="Project name"
          />
          <SortButton
            type="button"
            onClick={sortByName}
            isRotated={nextSortType === 'DESC' ? true : false}
          >
            <CaretIcon />
          </SortButton>
        </ProjectsHead>
        <ProjectsBody>
          <ProjectsList>
            {projectsList.map((project, index) => (
              <li key={index}>
                <Accordion
                  title={
                    <Checkbox
                      isAllChecked={isAllChecked}
                      label={project.projectName}
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
