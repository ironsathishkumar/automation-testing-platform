"use client";

import { Box, Paper, Typography } from "@mui/material";
import { ReactNode } from "react";

export function AuthFrame({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" } }}>
      <Box sx={{ display: { xs: "none", md: "flex" }, bgcolor: "#102A2A", color: "#F4FBFA", p: 8, flexDirection: "column", justifyContent: "space-between" }}>
        <Typography variant="overline" sx={{ letterSpacing: 1.6, color: "#8FBFBA" }}>
          Local automation testing platform
        </Typography>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, maxWidth: 460 }}>
            One place to design, organize, and later run your tests.
          </Typography>
          <Typography sx={{ mt: 2, maxWidth: 460, color: "#D5E7E4" }}>
            Projects, applications, environments, cases, suites, and plans stay on this machine.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "#8FBFBA" }}>
          Bound to localhost
        </Typography>
      </Box>
      <Box sx={{ display: "grid", placeItems: "center", p: 3 }}>
        <Paper sx={{ width: "100%", maxWidth: 420, p: 4 }}>
          <Typography variant="h5">{title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            {subtitle}
          </Typography>
          {children}
          <Box sx={{ mt: 2 }}>{footer}</Box>
        </Paper>
      </Box>
    </Box>
  );
}
