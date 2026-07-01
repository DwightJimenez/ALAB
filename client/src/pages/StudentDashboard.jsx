import Navbar from "@/components/Navbar";
import React, { useEffect, useState } from "react";
import StudentCatalog from "@/components/StudentCatalog";

const StudentDashboard = () => {
  const [selectedPage, setSelectedPage] = useState("home");
  return (
    <>
      <Navbar setSelectedPage={setSelectedPage} />
      {selectedPage === "home" && <StudentCatalog />}
    </>
  );
};

export default StudentDashboard;
