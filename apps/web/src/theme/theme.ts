"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#0F6E6B", contrastText: "#F7FFFE" },
    secondary: { main: "#C2410C" },
    background: { default: "#F3F6F5", paper: "#FFFFFF" },
    text: { primary: "#14221F", secondary: "#4E615C" },
    divider: "#D9E3E0",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.4 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});
