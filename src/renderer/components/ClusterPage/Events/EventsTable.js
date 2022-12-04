import propTypes from 'prop-types';
import dayjs from 'dayjs';
import { Renderer } from '@k8slens/extensions';
import styled from '@emotion/styled';
import { TABLE_HEADER_IDS } from './EventsPanel';
import { layout } from '../../styles';
import { apiKinds } from '../../../../api/apiConstants';
import * as strings from '../../../../strings';

const {
  Component: { Icon, Table, TableHead, TableRow, TableCell },
} = Renderer;

const {
  catalog: {
    entities: {
      common: {
        details: { unknownValue },
      },
    },
  },
} = strings;

const formatDate = (date) => {
  if (!date) {
    return undefined;
  }

  const dateObj = new Date(date);
  return dateObj.getTime() === 0
    ? undefined
    : dayjs(date).format('YYYY-MM-DD, HH:mm:ss');
};

//
// INTERNAL STYLED COMPONENTS
//

const FirstCellUiReformer = styled.div(() => ({
  width: layout.grid * 2,
  display: 'inline-block',
}));

const TableMessageCell = styled.div`
  display: flex;
  align-items: center;
  flex: 3 0;
  padding: ${layout.pad}px;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1;
  color: ${({ isWarning, isHeader }) =>
    isWarning
      ? 'var(--colorError)'
      : isHeader
      ? 'var(--tableHeaderColor)'
      : 'var(--textColorPrimary)'};
`;

//
// MAIN COMPONENT
//

export const EventsTable = ({
  tableHeaders,
  events,
  handleSortChange,
  isSortedByAsc,
}) => {
  return (
    <Table>
      <TableHead showTopLine>
        {tableHeaders.map((header, index) => {
          if (header.id === TABLE_HEADER_IDS.MESSAGE) {
            return (
              <TableMessageCell key={header.id} isHeader>
                {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                {header.label}
              </TableMessageCell>
            );
          } else if (header.id === TABLE_HEADER_IDS.SOURCE) {
            return (
              <TableCell key={header.id}>
                {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                {header.label}
              </TableCell>
            );
          } else {
            return (
              <TableCell key={header.id}>
                {index === 0 && <FirstCellUiReformer></FirstCellUiReformer>}
                {header.label}
                <button
                  onClick={() => handleSortChange(header.id, !isSortedByAsc)}
                >
                  <Icon material="arrow_drop_down" />
                </button>
              </TableCell>
            );
          }
        })}
      </TableHead>
      {events.map((event) => (
        <TableRow key={event.metadata.name}>
          <TableCell>
            <FirstCellUiReformer></FirstCellUiReformer>
            {event.spec.type || unknownValue()}
          </TableCell>
          <TableCell>{formatDate(event.spec.createdAt)}</TableCell>
          <TableMessageCell isWarning={event.spec.type === 'Warning'}>
            {event.spec.message || unknownValue()}
          </TableMessageCell>
          <TableCell>{event.metadata.source || unknownValue()}</TableCell>
          <TableCell>
            {event.spec.targetKind === apiKinds.MACHINE
              ? event.spec.targetName || unknownValue()
              : strings.clusterPage.common.emptyValue()}
          </TableCell>
          <TableCell>{event.spec.count || unknownValue()}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
};

EventsTable.propTypes = {
  tableHeaders: propTypes.array.isRequired,
  events: propTypes.array.isRequired,
  handleSortChange: propTypes.func.isRequired,
  isSortedByAsc: propTypes.bool.isRequired,
};
