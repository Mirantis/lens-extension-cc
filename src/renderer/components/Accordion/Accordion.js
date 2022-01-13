import { useState } from 'react';
import PropTypes from 'prop-types';
import styled from '@emotion/styled';
import { layout } from '../styles';
import { ChevronIcon } from './ChevronIcon';

const AccordionTitle = styled.div`
  display: flex;
  align-items: center;
`;

const AccordionButton = styled.button`
  display: flex;
  background: transparent;
  cursor: pointer;
  margin-right: ${layout.grid}px;
  transform: ${({ isOpen }) => (isOpen ? 'rotate(90deg)' : 'rotate(0deg)')};
`;

const AccordionItem = styled.div`
  overflow: hidden;
`;

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
          <ChevronIcon />
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
