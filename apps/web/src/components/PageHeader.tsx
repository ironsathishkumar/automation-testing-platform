"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3, alignItems: { sm: "center" } }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4">{title}</Typography>
        {subtitle ? (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 4, textAlign: "center" }}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: action ? 2 : 0 }}>
        {body}
      </Typography>
      {action}
    </Box>
  );
}

export function PrimaryButton(props: { children: ReactNode; onClick?: () => void; href?: string }) {
  if (props.href) {
    return (
      <Button variant="contained" href={props.href}>
        {props.children}
      </Button>
    );
  }
  return (
    <Button variant="contained" onClick={props.onClick}>
      {props.children}
    </Button>
  );
}
