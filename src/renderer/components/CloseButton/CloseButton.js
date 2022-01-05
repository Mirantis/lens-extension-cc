import PropTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { closeButton } from '../../../strings';

const { Icon } = Renderer.Component;

const CloseButtonContent = styled.div`
  position: absolute;
  margin-left: auto;
`;

const CloseIconWrapper = styled.div`
  width: 35px;
  height: 35px;
  display: grid;
  place-items: center;
  cursor: pointer;
  border: 2px solid #8e92978c;
  border-radius: 50%;

  &:hover {
    background-color: #72767d25;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Esc = styled.div`
  text-align: center;
  margin-top: 8px;
  font-weight: bold;
  user-select: none;
  color: #8e92978c;
  pointer-events: none;
`;

export const CloseButton = ({ onClick }) => (
  <CloseButtonContent onClick={onClick}>
    <CloseIconWrapper role="button" aria-label="Close">
      <Icon material="close" />
    </CloseIconWrapper>
    <Esc aria-hidden="true">{closeButton.title()}</Esc>
  </CloseButtonContent>
);

CloseButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};
