/**
 * Behavior-preserving facade for compound MUI primitives.
 *
 * These components keep MUI's exact public types because domain screens compose
 * them in many different ways. Visual defaults still come from the central
 * theme, while pages no longer depend directly on the vendor package.
 */
export {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
