import { createTheme } from "@mui/material/styles";
import { faIR } from "@mui/material/locale";
import { createComponentOverrides } from "@/theme/componentOverrides";
import { designTokens } from "@/theme/tokens";
import { typographyOptions } from "@/theme/typography";

const { color, motion, radius, breakpoint, zIndex } = designTokens;

export const theme = createTheme(
  {
    direction: "rtl",
    breakpoints: {
      values: breakpoint,
    },
    palette: {
      mode: "dark",
      primary: {
        main: color.brand.primary,
        light: color.brand.primaryLight,
        dark: color.brand.primaryDark,
        contrastText: color.text.inverse,
      },
      secondary: {
        main: color.brand.secondary,
        contrastText: color.text.inverse,
      },
      success: { main: color.status.success },
      warning: { main: color.status.warning },
      error: { main: color.status.error },
      info: { main: color.status.info },
      background: {
        default: color.background.default,
        paper: color.background.surface,
      },
      text: {
        primary: color.text.primary,
        secondary: color.text.secondary,
        disabled: color.text.disabled,
      },
      divider: color.border.default,
    },
    typography: typographyOptions,
    shape: { borderRadius: radius.lg },
    transitions: {
      duration: motion.duration,
      easing: motion.easing,
    },
    zIndex: {
      appBar: zIndex.appBar,
      drawer: zIndex.drawer,
      modal: zIndex.modal,
      snackbar: zIndex.toast,
      tooltip: zIndex.tooltip,
    },
    components: createComponentOverrides(),
  },
  faIR,
);
