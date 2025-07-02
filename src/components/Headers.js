import React, { useState, useContext } from "react";
import { ThemeContext } from "../ThemeContext";
import { 
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, 
  ListItemButton, ListItemText, Box, Button, useTheme, useMediaQuery 
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

import { useNavigate } from "react-router-dom";

export default function Headers() {
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Manage Jobs", path: "/managejobs" },
    { label: "Form", path: "/form" },
    { label: "Logout", path: "/" }, // Replace with real logout logic
  ];

  const toggleDrawer = (open) => () => {
    setDrawerOpen(open);
  };

  const handleNavClick = (path) => {
    setDrawerOpen(false);
    if (path === "/") {
      // TODO: add signOut logic here if needed
      navigate(path);
    } else {
      navigate(path);
    }
  };

  const drawerList = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {navItems.map(({ label, path }) => (
          <ListItem key={label} disablePadding>
            <ListItemButton onClick={() => handleNavClick(path)}>
              <ListItemText primary={label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Dark mode toggle inside drawer */}
      <Box
        sx={{
          px: 2,
          mt: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid",
          borderColor: "divider",
          pt: 2,
        }}
      >
        <Typography variant="body1">Dark Mode</Typography>
        <IconButton
          onClick={(e) => {
            e.stopPropagation(); // prevent drawer closing when clicking toggle
            toggleDarkMode();
          }}
          color="inherit"
          aria-label="toggle dark mode"
        >
          {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/dashboard")}
          >
            ShiftKiroku 　シフト記録
          </Typography>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={toggleDrawer(true)}
                aria-label="open drawer"
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={toggleDrawer(false)}
              >
                {drawerList}
              </Drawer>
            </>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {navItems.map(({ label, path }) => (
                <Button
                  key={label}
                  color="inherit"
                  onClick={() => handleNavClick(path)}
                  sx={{ textTransform: "none" }}
                >
                  {label}
                </Button>
              ))}
              <IconButton
                color="inherit"
                onClick={toggleDarkMode}
                aria-label="toggle dark mode"
                sx={{ ml: 1 }}
              >
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Box>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
}
