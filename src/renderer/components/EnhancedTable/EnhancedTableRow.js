import PropTypes from 'prop-types';
import { useState } from 'react';
import styled from '@emotion/styled';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { Renderer } from '@k8slens/extensions';

const { Component } = Renderer;

const EnhTableRow = styled(TableRow)`
  background-color: ${({ isTopLevel }) =>
    isTopLevel ? 'var(--layoutTabsBackground)' : 'var(--mainBackground)'};
`;

const EnhTableCell = styled(TableCell)`
  border: 0;
  font-size: var(--font-size);
  line-height: normal;
  color: var(--textColorPrimary);
  padding: 6px 18px;
`;

const EnhCollapseBtn = styled.button`
  background: transparent;
  cursor: pointer;
  margin-right: 6px;
  transform: translateY(-2px);
`;

export const EnhancedTableRow = (props) => {
  const { row } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <EnhTableRow isTopLevel={true}>
        <EnhTableCell component="th" scope="row">
          <EnhCollapseBtn onClick={() => setOpen(!open)}>
            {open ? (
              <Component.Icon
                material="expand_more"
                style={{
                  color: 'var(--textColorPrimary)',
                  fontSize: 'calc(var(--font-size) * 1.8)',
                }}
              />
            ) : (
              <Component.Icon
                material="chevron_right"
                style={{
                  color: 'var(--textColorPrimary)',
                  fontSize: 'calc(var(--font-size) * 1.8)',
                }}
              />
            )}
          </EnhCollapseBtn>
          {row.cloud.name}
        </EnhTableCell>
        <EnhTableCell>{row.cloud.cloudUrl}</EnhTableCell>
        <EnhTableCell>{row.cloud.username}</EnhTableCell>
        {/* NEED TO CHANGE STATUS DYNAMIC */}
        <EnhTableCell>STATUS</EnhTableCell>
        <EnhTableCell align="right">
          <Component.Icon
            material="more_vert"
            style={{
              color: 'var(--textColorPrimary)',
              fontSize: 'calc(var(--font-size) * 1.8)',
            }}
          />
        </EnhTableCell>
      </EnhTableRow>
      {open &&
        row.namespaces.map(({ name }) => (
          <EnhTableRow key={name}>
            <EnhTableCell>{name}</EnhTableCell>
            <EnhTableCell></EnhTableCell>
            <EnhTableCell></EnhTableCell>
            {/* NEED TO CHANGE STATUS DYNAMIC */}
            <EnhTableCell>STATUS</EnhTableCell>
            <EnhTableCell></EnhTableCell>
          </EnhTableRow>
        ))}
    </>
  );
};

EnhancedTableRow.propTypes = {
  row: PropTypes.object.isRequired,
};
