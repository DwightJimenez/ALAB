import Navbar from "@/components/Navbar";
import React, { useState } from "react";
import ManageBKT from "@/components/ManageBKT";
import ManageInventory from "@/components/ManageInventory";
import ManageRequests from "@/components/ManageRequest";
import FacultyOverview from "@/components/FacultyOverview";
import ManageSessions from "@/components/ManageSessions";
import CreateExperiment from "@/components/CreateExperiment";
import ExperimentDirectory from "@/components/ExperimentDirectory";

const FacultyDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");
  
  return (
    <div className="min-h-screen w-full pb-14 bg-white bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px] border">
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      
      {/* Route to the correct component based on navbar selection */}
      {(selectedPage === "dashboard" || selectedPage === "home") && <FacultyOverview />}
      {selectedPage==="experiments" && <ExperimentDirectory />}
      {selectedPage === "safegate" && <ManageBKT />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "requests" && <ManageRequests />}
      {selectedPage === "booking" && <ManageSessions />}
      
    </div>
  );
};

export default FacultyDashboard;