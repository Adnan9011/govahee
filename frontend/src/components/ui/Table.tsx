import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/ui/primitives";
import {
  Paper,
  type SxProps,
  type TableCellProps,
  type TableProps as MuiTableProps,
  type Theme,
} from "@mui/material";
import type { Key, ReactNode } from "react";
import { EmptyState } from "@/components/ui/FeedbackStates";
import { Skeleton } from "@/components/ui/FeedbackStates";
import { mergeSx } from "@/components/ui/sx";

export type TableColumn<Row> = {
  id: string;
  header: ReactNode;
  render: (row: Row, index: number) => ReactNode;
  align?: TableCellProps["align"];
  width?: string | number;
  minWidth?: string | number;
  hideOnMobile?: boolean;
  cellSx?: SxProps<Theme>;
};

export type TableProps<Row> = Omit<MuiTableProps, "children"> & {
  rows: readonly Row[];
  columns: readonly TableColumn<Row>[];
  rowKey: (row: Row, index: number) => Key;
  loading?: boolean;
  loadingRows?: number;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  minWidth?: string | number;
  pagination?: ReactNode;
  onRowClick?: (row: Row) => void;
  containerSx?: SxProps<Theme>;
  ariaLabel?: string;
};

export function Table<Row>({
  rows,
  columns,
  rowKey,
  loading = false,
  loadingRows = 5,
  emptyTitle,
  emptyDescription,
  minWidth = 640,
  pagination,
  onRowClick,
  containerSx,
  ariaLabel = "جدول داده‌ها",
  size = "small",
  sx,
  ...props
}: TableProps<Row>) {
  const columnVisibilitySx = (column: TableColumn<Row>) =>
    column.hideOnMobile
      ? ({ display: { xs: "none", sm: "table-cell" } } as const)
      : {};

  return (
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <TableContainer
        sx={[
          { width: "100%", maxWidth: "100%", overflowX: "auto" },
          ...(Array.isArray(containerSx) ? containerSx : [containerSx]),
        ] as SxProps<Theme>}
      >
        <MuiTable
          {...props}
          size={size}
          aria-label={ariaLabel}
          sx={mergeSx({ minWidth }, sx)}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sx={{
                    width: column.width,
                    minWidth: column.minWidth,
                    ...columnVisibilitySx(column),
                  }}
                >
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: loadingRows }, (_, rowIndex) => (
                  <TableRow key={`loading-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        sx={[
                          columnVisibilitySx(column),
                          ...(Array.isArray(column.cellSx) ? column.cellSx : [column.cellSx]),
                        ] as SxProps<Theme>}
                      >
                        <Skeleton width={rowIndex % 2 === 0 ? "82%" : "64%"} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row, rowIndex) => (
                  <TableRow
                    key={rowKey(row, rowIndex)}
                    hover
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? "button" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    sx={onRowClick ? { cursor: "pointer" } : undefined}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={[
                          columnVisibilitySx(column),
                          ...(Array.isArray(column.cellSx) ? column.cellSx : [column.cellSx]),
                        ] as SxProps<Theme>}
                      >
                        {column.render(row, rowIndex)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </MuiTable>
      </TableContainer>
      {!loading && rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
      {pagination}
    </Paper>
  );
}

export const DataTable = Table;
