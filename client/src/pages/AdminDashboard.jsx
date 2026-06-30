import React from "react";
import Sidebar from "../components/Navbar";
import ManageUsers from "../components/ManageUsers";
import { useState } from "react";
import ManageInventory from "@/components/ManageInventory";

const AdminDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("dashboard");

  return (
    <div className="flex h-screen w-full absolute inset-0 -z-10 h-full w-full bg-sky bg-[radial-gradient(#4274D9_1px,transparent_1px)] [background-size:20px_20px]">
      <Sidebar setSelectedPage={setSelectedPage} />
      {selectedPage === "users" && <ManageUsers />}
      {selectedPage === "inventory" && <ManageInventory />}
    </div>
  );
};

export default AdminDashboard;
