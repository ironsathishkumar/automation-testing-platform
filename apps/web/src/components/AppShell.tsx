"use client";

import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { Box, Button, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { api } from "@/lib/api";
import { User } from "@atp/shared-types";

const DRAWER_WIDTH = 248;

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: <DashboardOutlinedIcon /> },
  { href: "/projects", label: "Projects", icon: <FolderOutlinedIcon /> },
  { href: "/engines", label: "Engines", icon: <ScienceOutlinedIcon /> },
  { href: "/ai", label: "AI", icon: <AutoAwesomeOutlinedIcon /> },
  { href: "/settings", label: "Settings", icon: <SettingsOutlinedIcon /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/auth/me"),
  });

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
    router.refresh();
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "#102A2A",
            color: "#E7F3F1",
            borderRight: 0,
          },
        }}
      >
        <Stack sx={{ px: 2.5, py: 3 }} spacing={0.5}>
          <Typography variant="overline" sx={{ color: "#8FBFBA", letterSpacing: 1.4 }}>
            Local platform
          </Typography>
          <Typography variant="h6">Test control</Typography>
        </Stack>
        <List sx={{ px: 1.5 }}>
          {NAV.map((item) => {
            const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={selected}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  color: "#E7F3F1",
                  "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.12)" },
                  "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,0.16)" },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>
        <Box sx={{ mt: "auto", p: 2.5 }}>
          <Typography variant="body2" sx={{ color: "#D5E7E4" }}>
            {me.data ? `${me.data.firstName} ${me.data.lastName}` : "Signed in"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#8FBFBA" }}>
            {me.data?.email}
          </Typography>
          <Button startIcon={<LogoutOutlinedIcon />} onClick={() => void logout()} sx={{ mt: 1.5, color: "#E7F3F1" }}>
            Log out
          </Button>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, maxWidth: 1200 }}>
        {children}
      </Box>
    </Box>
  );
}
