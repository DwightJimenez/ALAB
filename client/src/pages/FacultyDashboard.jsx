import Navbar from "@/components/Navbar";
import React, { useState } from "react";
import ManageBKT from "@/components/ManageBKT";
import ManageInventory from "@/components/ManageInventory";
import ManageRequests from "@/components/ManageRequest";
import FacultyOverview from "@/components/FacultyOverview";
import CreateExperiment from "@/components/CreateExperiment";
import ExperimentDirectory from "@/components/ExperimentDirectory";
import GateScanner from "@/components/GateScanner";
import PassedList from "@/components/PassedList";
import { SidebarTrigger } from "@/components/ui/sidebar";

const FacultyDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className="flex min-h-screen w-full bg-white">
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      <SidebarTrigger className="ml-2 mt-6" />
      {(selectedPage === "dashboard" || selectedPage === "home") && (
        <FacultyOverview />
      )}
      {selectedPage === "experiments" && <ExperimentDirectory />}
      {selectedPage === "safegate" && <ManageBKT />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "requests" && <ManageRequests />}
      {selectedPage === "scanner" && <GateScanner />}
      {selectedPage === "list" && <PassedList />}
    </div>
  );
};

export default FacultyDashboard;
