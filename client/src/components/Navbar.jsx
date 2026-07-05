import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/authSlice";
import {
  BookPlus,
  DoorClosedLocked,
  House,
  LayoutDashboard,
  ShelvingUnit,
  UsersRound,
} from "lucide-react";


const Navbar = ({ selectedPage, setSelectedPage }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: "include",
      });
      dispatch(logout());
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const getMenuItemClass = (pageName) => `
    flex flex-col items-center px-4 rounded-full text-xs font-medium transition-all duration-300 ease-out cursor-pointer select-none
    ${
      selectedPage === pageName
        ? "text-navy"
        : "text-navy hover:text-white/80 active:scale-95"
    }
  `;

  
  const getIconClass = (pageName) => `
    p-2 rounded-lg transition-all duration-300 
    ${
      selectedPage === pageName
        ? "bg-blue/60 text-white shadow-inner border border-white/20 scale-105"
        : "hover:bg-blue/20 hover:text-white border border-transparent"
    }
  `;

  return (
    <header className="fixed bottom-0 left-0 right-0 z-50 p-4 w-full flex justify-center">
      <div className="w-full max-w-6xl flex items-center justify-between px-6 py-3 rounded-2xl border border-navy/10 bg-blue/40 backdrop-blur-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-wider text-white">
            ALAB
          </span>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/5">
          {/* Dashboard */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("dashboard")}
              onClick={() => setSelectedPage("dashboard")}
            >
              <div className={getIconClass("dashboard")}>
                <LayoutDashboard size={24} />
              </div>
              <span>Dashboard</span>
            </div>
          )}

          {/* Home */}
          <div
            role="button"
            className={getMenuItemClass("home")}
            onClick={() => setSelectedPage("home")}
          >
            <div className={getIconClass("home")}>
              <House size={24} />
            </div>
            <span>Home</span>
          </div>

          {/* Users */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("users")}
              onClick={() => setSelectedPage("users")}
            >
              <div className={getIconClass("users")}>
                <UsersRound size={24} />
              </div>
              <span>Users</span>
            </div>
          )}

          {/* Inventory */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("inventory")}
              onClick={() => setSelectedPage("inventory")}
            >
              <div className={getIconClass("inventory")}>
                <ShelvingUnit size={24} />
              </div>
              <span>Inventory</span>
            </div>
          )}

          {/* Equipment Booking (Requests) */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("requests")}
              onClick={() => setSelectedPage("requests")}
            >
              <div className={getIconClass("requests")}>
                <BookPlus size={24} />
              </div>
              <span>Requests</span>
            </div>
          )}

          {/* Booking */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("booking")}
              onClick={() => setSelectedPage("booking")}
            >
              <div className={getIconClass("booking")}>
                <BookPlus size={24} />
              </div>
              <span>Booking</span>
            </div>
          )}

          {/* Safety Gate */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("safegate")}
              onClick={() => setSelectedPage("safegate")}
            >
              <div className={getIconClass("safegate")}>
                <DoorClosedLocked size={24} />
              </div>
              <span>Safety Gate</span>
            </div>
          )}
        </nav>

        {/* Action Button (Log Out) */}
        <div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-red-500/30 bg-red-500/10 text-red-400 backdrop-blur-sm transition-all duration-300 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25a.75.75 0 01.75.75v9a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM6.166 5.106a.75.75 0 010 1.06 8.25 8.25 0 1011.668 0 .75.75 0 111.06-1.06c3.808 3.807 3.808 9.98 0 13.788-3.807 3.808-9.98 3.808-13.788 0-3.808-3.807-3.808-9.98 0-13.788a.75.75 0 011.06 0z"
                clipRule="evenodd"
              ></path>
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;