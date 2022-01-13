import { useState } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
<<<<<<< HEAD
import { Renderer } from '@k8slens/extensions';
import { layout } from '../styles';

const { Component } = Renderer;
=======
import { layout } from '../styles';
import { ChevronIcon } from './ChevronIcon';
>>>>>>> added synchronized block

const AccordionTitle = styled.div`
  display: flex;
  align-items: center;
`;

const AccordionButton = styled.button`
  display: flex;
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid}px;
<<<<<<< HEAD
  transform: ${({ isOpen }) => (isOpen ? 'rotate(90deg)' : 'rotate(0deg)')};
=======
  transform: ${({isOpen}) => isOpen ? 'rotate(90deg)' : 'rotate(0deg)'};
>>>>>>> added synchronized block
`;

const AccordionItem = styled.div`
  overflow: hidden;
`;

<<<<<<< HEAD
const chevronIconStyles = {
  color: 'var(--textColorSecondary)',
  fontSize: 'calc(var(--font-size) * 1.8)',
};

=======
>>>>>>> added synchronized block
export const Accordion = ({ title, children }) => {
  // @type {boolean} states of accordion
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <AccordionTitle isOpen={isOpen}>
        <AccordionButton
          type="button"
          isOpen={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Component.Icon material="chevron_right" style={chevronIconStyles} />
        </AccordionButton>
        {title}
      </AccordionTitle>
      <AccordionItem>{isOpen && <div>{children}</div>}</AccordionItem>
    </div>
  );
};

Accordion.propTypes = {
  title: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
};
