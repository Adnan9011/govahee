import { TablePagination } from "@/components/ui/primitives";
import { type TablePaginationProps } from "@mui/material";

export type PaginationProps = Omit<TablePaginationProps, "component"> & {
  component?: TablePaginationProps["component"];
};

export function Pagination({
  component = "div",
  labelRowsPerPage = "تعداد در صفحه",
  ...props
}: PaginationProps) {
  return (
    <TablePagination
      {...props}
      component={component}
      labelRowsPerPage={labelRowsPerPage}
      showFirstButton
      showLastButton
    />
  );
}
