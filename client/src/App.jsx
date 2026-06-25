import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials, logout } from './redux/authSlice';

import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  const dispatch = useDispatch();
  const [isChecking, setIsChecking] = useState(true); // Acts as a loading screen

  useEffect(() => {
    // This runs once when the app first loads
    const verifyUser = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/verify", {
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
    return <div style={{ textAlign: 'center', marginTop: '20vh' }}>Loading ALAB...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes check Redux, which is now safely populated! */}
        <Route 
          path="/student-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/faculty-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <FacultyDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'technician']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;