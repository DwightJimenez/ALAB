import Navbar from "@/components/Navbar";
import React from "react";
import ManageBKT from "@/components/ManageBKT";
import { useState } from "react";
import ManageInventory from "@/components/ManageInventory";
import StudentCatalog from "@/components/StudentCatalog";
import ManageRequests from "@/components/ManageRequest";

const FacultyDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");
  return (
    <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px]">
      <Navbar setSelectedPage={setSelectedPage} />
      {selectedPage === "safegate" && <ManageBKT />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "requests" && <ManageRequests />}
    </div>
  );
};

export default FacultyDashboard;
