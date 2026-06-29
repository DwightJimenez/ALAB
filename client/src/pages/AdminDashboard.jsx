import React from "react";
import Sidebar from "../components/Sidebar";
import ManageUsers from "../components/ManageUsers";
import { useState } from "react";
import ManageInventory from "@/components/ManageInventory";

const AdminDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className="flex h-screen w-full ">
      <Sidebar setSelectedPage={setSelectedPage} />
      {selectedPage === "users" && <ManageUsers />}
      {selectedPage === "inventory" && <ManageInventory />}
    </div>
  );
};

export default AdminDashboard;
