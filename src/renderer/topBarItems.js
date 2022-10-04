import { useState, useCallback } from 'react';
import propTypes from 'prop-types';
import styled from '@emotion/styled';
import { ROUTE_SYNC_VIEW } from '../routes';
import { GlobalPageIcon } from './components/GlobalPage/GlobalPage';
import { layout } from './components/styles';
import * as strings from '../strings';

const colorNormal = 'var(--textColorPrimary)';
const colorHover = 'var(--textColorSecondary)';

const TopBarExtension = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--layoutTabsBackground);
  padding: ${layout.pad * 0.25}px ${layout.pad * 0.5}px;
  border-radius: 4px;
`;

const TopBarExtensionTitle = styled.p`
  font-size: calc(var(--font-size) * 0.85);
  line-height: 1.17;
  color: ${({ hover }) => (hover ? colorHover : colorNormal)};
  max-width: ${layout.grid * 22.5}px;
  margin-left: ${layout.grid * 1.25}px;
`;

const TopBarItem = function ({ extension }) {
  //
  // STATE
  //

  const [hover, setHover] = useState(false);

  //
  // EVENTS
  //

  const handleMouseEnter = useCallback(function () {
    setHover(true);
  }, []);

  const handleMouseLeave = useCallback(function () {
    setHover(false);
  }, []);

  //
  // RENDER
  //

  return (
    <TopBarExtension
      onClick={() => extension.navigate(ROUTE_SYNC_VIEW)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <GlobalPageIcon size={24} fill={hover ? colorHover : colorNormal} />
      <TopBarExtensionTitle hover={hover}>
        {strings.extension.topBar['label']()}
      </TopBarExtensionTitle>
    </TopBarExtension>
  );
};

TopBarItem.propTypes = {
  extension: propTypes.object.isRequired,
};

export function generateTopBarItems(extension) {
  return [
    {
      components: {
        Item: () => {
          return <TopBarItem extension={extension} />;
        },
      },
    },
  ];
}
