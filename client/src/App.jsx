import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials, logout } from "./redux/authSlice";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Quiz from "./pages/Quiz";
import Assessment from "./pages/Assessment";
import Profile from "./components/Profile";

function App() {
  const dispatch = useDispatch();
  const [isChecking, setIsChecking] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    // This runs once when the app first loads
    const verifyUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/verify`, {
          method: "GET",
          credentials: "include", // Essential: Sends the cookie!
        });

        if (response.ok) {
          const data = await response.json();
          // Token is good! Put the user back in Redux.
          dispatch(setCredentials(data.user));
        } else {
          // Token is expired or missing. Clear Redux.
          dispatch(logout());
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        dispatch(logout());
      } finally {
        // Whether it succeeded or failed, stop the loading screen
        setIsChecking(false);
      }
    };

    verifyUser();
  }, [dispatch]);

  // Show a blank screen (or a spinner) while we check the cookie
  if (isChecking) {
    return (
      <div style={{ textAlign: "center", marginTop: "20vh" }}>
        Loading ALAB...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes check Redux, which is now safely populated! */}
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRoles={["STUDENT"]}>
              <div className="min-h-screen w-full bg-white bg-[linear-gradient(to_right,#95CCDD_1px,transparent_1px),linear-gradient(to_bottom,#95CCDD_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <StudentDashboard />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute allowedRoles={["FACULTY"]}>
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "TECHNICIAN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz/:skillId"
          element={
            <ProtectedRoute allowedRoles={["STUDENT"]}>
              <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#95CCDD_1px,transparent_1px),linear-gradient(to_bottom,#95CCDD_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <Quiz />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment"
          element={
            <ProtectedRoute allowedRoles={["STUDENT"]}>
              <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#95CCDD_1px,transparent_1px),linear-gradient(to_bottom,#95CCDD_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <Assessment />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "FACULTY", "ADMIN"]}>
              <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#95CCDD_1px,transparent_1px),linear-gradient(to_bottom,#95CCDD_1px,transparent_1px)] bg-[size:6rem_4rem]">
                <Profile />
              </div>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
