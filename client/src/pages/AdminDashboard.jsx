import React from "react";
import Sidebar from "../components/Navbar";
import ManageUsers from "../components/ManageUsers";
import { useState } from "react";
import ManageInventory from "@/components/ManageInventory";
import ManageSessions from "@/components/ManageSessions";
import AdminOverview from "@/components/AdminOverview";

const AdminDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className="flex h-screen min-h-screen w-full bg-white bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px] border">
      <Sidebar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      {selectedPage === "dashboard" && <AdminOverview/>}
      {selectedPage === "users" && <ManageUsers />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "booking" && <ManageSessions />}
    </div>
  );
};

export default AdminDashboard;
