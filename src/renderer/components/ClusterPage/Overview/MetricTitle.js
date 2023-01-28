import propTypes from 'prop-types';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { layout } from '../../styles';

const { Icon, Tooltip } = Renderer.Component;

//
// INTERNAL STYLED COMPONENTS
//

const Title = styled.div`
  display: flex;
  justify-content: center;

  & > p {
    font-size: calc(var(--font-size) * 1.28);
  }

  i {
    display: block;
    margin-left: ${layout.pad}px;
  }
`;

const TooltipInfo = styled.div`
  p {
    margin-top: ${layout.pad}px;
  }
`;

// Styles for metrics tooltip
const tooltipIconStyles = {
  color: 'var(--primary)',
};

export const MetricTitle = ({ title, tooltipText }) => {
  return (
    <Title>
      <p>{title}</p>
      {tooltipText && (
        <>
          <Icon
            material="info_outlined"
            size={22}
            style={tooltipIconStyles}
            id={title}
          />
          <Tooltip targetId={title} style={{ textAlign: 'left' }}>
            <TooltipInfo
              dangerouslySetInnerHTML={{
                __html: tooltipText,
              }}
            ></TooltipInfo>
          </Tooltip>
        </>
      )}
    </Title>
  );
};

MetricTitle.propTypes = {
  title: propTypes.string.isRequired,
  tooltipText: propTypes.string.isRequired,
};
