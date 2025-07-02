// MobileTabs.js
import React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";

export default function MobileTabs({ tabs, selectedTab, setSelectedTab }) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        bgcolor: "background.paper",
        zIndex: 1100,
        borderBottom: 1,
        borderColor: "divider",
        boxShadow: "0 2px 8px rgb(0 0 0 / 0.1)",
      }}
    >
      <Tabs
        value={selectedTab}
        onChange={(e, val) => setSelectedTab(val)}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
        aria-label="mobile navigation tabs"
      >
        {tabs.map((tab, idx) => (
          <Tab
            key={tab.label}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{
              fontWeight: selectedTab === idx ? "bold" : "normal",
              fontSize: "1rem",
              textTransform: "none",
              paddingY: 1.5,
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
