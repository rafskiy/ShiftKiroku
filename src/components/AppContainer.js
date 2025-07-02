// AppContainer.js
import React, { useState } from "react";
import Dashboard from "./Dashboard";
import Form from "./Form";
import ManageJobs from "./ManageJobs";
import MobileTabs from "./MobileTabs";

import HomeIcon from "@mui/icons-material/Home";
import WorkIcon from "@mui/icons-material/Work";
import SettingsIcon from "@mui/icons-material/Settings";

export default function AppContainer() {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { label: "Dashboard", icon: <HomeIcon /> },
    { label: "Form", icon: <WorkIcon /> },
    { label: "Manage Jobs", icon: <SettingsIcon /> },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f7fa" }}>
      <MobileTabs tabs={tabs} selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
      <div style={{ padding: 16 }}>
        {selectedTab === 0 && <Dashboard />}
        {selectedTab === 1 && <Form />}
        {selectedTab === 2 && <ManageJobs />}
      </div>
    </div>
  );
}
