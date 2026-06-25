import React from "react";
import Sidebar from "../components/Sidebar";
import ManageUsers from "./ManageUsers";

const AdminDashboard = () => {
  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900 ">
      <Sidebar />
      <ManageUsers />
    </div>
  );
};

export default AdminDashboard;
