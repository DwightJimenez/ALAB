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

const FacultyDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className="min-h-screen w-full p-6 pb-28 bg-white bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px] border">
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />

      {/* Route to the correct component based on navbar selection */}
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
