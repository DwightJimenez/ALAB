import React from "react";
import Navbar from "../components/Navbar";
import ManageUsers from "../components/ManageUsers";
import { useState } from "react";
import ManageInventory from "@/components/ManageInventory";
import ManageSessions from "@/components/ManageSessions";
import AdminOverview from "@/components/AdminOverview";
import { SidebarTrigger } from "@/components/ui/sidebar";

const AdminDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className="flex min-h-screen w-full bg-white">
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      <SidebarTrigger className="m-2" />
      {selectedPage === "dashboard" && <AdminOverview />}
      {selectedPage === "users" && <ManageUsers />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "booking" && <ManageSessions />}
    </div>
  );
};

export default AdminDashboard;
