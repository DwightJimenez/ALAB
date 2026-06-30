import ManageBKT from "@/components/ManageBKT";
import Navbar from "@/components/Navbar";
import React from "react";

const FacultyDashboard = () => {
  return (
    <div className="flex h-screen w-full absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px]">
      <Navbar />
      <ManageBKT />
    </div>
  );
};

export default FacultyDashboard;
