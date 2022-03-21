import React from 'react';
import styled from '@emotion/styled';
import { ROUTE_GLOBAL_PAGE } from '../routes';
import { GlobalPageIcon } from './components/GlobalPage/GlobalPage';
import { layout } from './components/styles';
import * as strings from '../strings';

const TopBarExtension = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--layoutTabsBackground);
  padding: ${layout.pad * 0.25}px ${layout.pad * 0.5}px;
  border-radius: 4px;
  cursor: pointer;
`;

const TopBarExtensionTitle = styled.p`
  font-size: calc(var(--font-size) * 0.85);
  line-height: 1.17;
  color: var(--textColorPrimary);
  max-width: ${layout.grid * 22.5}px;
  margin-left: ${layout.grid * 1.25}px;
`;

export function registerTopBarItems(extension) {
  return [
    {
      components: {
        Item: () => {
          return (
            <TopBarExtension
              onClick={() => extension.navigate(ROUTE_GLOBAL_PAGE)}
            >
              <GlobalPageIcon size={24} fill="var(--textColorPrimary)" />
              <TopBarExtensionTitle>
                {strings.extension.statusBar['label']()}
              </TopBarExtensionTitle>
            </TopBarExtension>
          );
        },
      },
    },
  ];
}
