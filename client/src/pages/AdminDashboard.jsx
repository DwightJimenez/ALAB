import React from "react";
import Navbar from "../components/Navbar";
import ManageUsers from "../components/admin/ManageUsers";
import { useState } from "react";
import ManageInventory from "@/components/admin/ManageInventory";
import ManageSessions from "@/components/admin/ManageSessions";
import AdminOverview from "@/components/admin/AdminOverview";
import { SidebarTrigger } from "@/components/ui/sidebar";
import ManageFacultySections from "@/components/admin/ManageFacultySections";
import ManageSpecialRequest from "@/components/admin/ManageSpecialRequest";

const AdminDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className='flex min-h-screen w-full bg-white'>
      <Navbar setSelectedPage={setSelectedPage} selectedPage={selectedPage} />
      <header className='sticky top-0 z-50 flex h-16 items-center px-4'>
        <SidebarTrigger />
      </header>
      {selectedPage === "dashboard" && <AdminOverview />}
      {selectedPage === "users" && <ManageUsers />}
      {selectedPage === "inventory" && <ManageInventory />}
      {selectedPage === "booking" && <ManageSessions />}
      {selectedPage === "manage-faculty-sections" && <ManageFacultySections />}
      {selectedPage === "special-requests" && <ManageSpecialRequest />}
    </div>
  );
};

export default AdminDashboard;
