import React from 'react';
import styled from '@emotion/styled';
import { ROUTE_GLOBAL_PAGE } from '../routes';
import { GlobalPageIcon } from './components/GlobalPage/GlobalPage';
import { layout } from './components/styles';
import * as strings from '../strings';

const statusItemColor = '#8F9296';

const TopBarExtension = styled.div`
  position: absolute;
  top: ${layout.grid * 1.25}px;
  right: ${layout.grid * 15}px;
  display: flex;
  align-items: center;
  background-color: var(--mainBackground);
  padding: ${layout.pad * 0.25}px ${layout.pad * 0.5}px;
  border-radius: 4px;
  cursor: pointer;
`;

const TopBarExtensionTitle = styled.p`
  font-size: calc(var(--font-size) * 0.85);
  line-height: 1.17;
  color: #c4c4c4;
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
              <GlobalPageIcon size={24} fill={statusItemColor} />
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
