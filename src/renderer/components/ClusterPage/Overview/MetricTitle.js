import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../../styles';

const { Icon, Tooltip } = Renderer.Component;

//
// INTERNAL STYLED COMPONENTS
//

const Title = styled.div`
  position: relative;
  display: inline-block;
  margin: 0 auto;

  & > p {
    font-size: calc(var(--font-size) * 1.28);
  }
`;

const IconWrapper = styled.div`
  position: absolute;
  top: ${layout.grid / 2}px;
  right: -${layout.grid * 10.5}px;
`;

// Styles for metrics tooltip
const tooltipIconStyles = {
  color: 'var(--primary)',
};

export const MetricTitle = ({ title, tooltipText }) => {
  return (
    <Title>
      <p>{title}</p>
      <IconWrapper>
        <Icon
          material="info_outlined"
          size={22}
          style={tooltipIconStyles}
          id={title}
        />
        <Tooltip targetId={title} style={{ textAlign: 'left' }}>
          <div
            dangerouslySetInnerHTML={{
              __html: tooltipText,
            }}
          ></div>
        </Tooltip>
      </IconWrapper>
    </Title>
  );
};

MetricTitle.propTypes = {
  title: propTypes.string.isRequired,
  tooltipText: propTypes.string.isRequired,
};
