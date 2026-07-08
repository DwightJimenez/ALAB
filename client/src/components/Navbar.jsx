import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/authSlice";
import {
  BookPlus,
  DoorClosedLocked,
  House,
  LayoutDashboard,
  Microscope,
  ShelvingUnit,
  UsersRound,
  CircleUserRound,
  LogOut,
  User
} from "lucide-react";

// Shadcn UI Imports
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Adjust path if your shadcn folder is different

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

          {/* Experiments */}
          <div
            role="button"
            className={getMenuItemClass("experiments")}
            onClick={() => setSelectedPage("experiments")}
          >
            <div className={getIconClass("experiments")}>
              <Microscope size={24} />
            </div>
            <span>Experiments</span>
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

          {/* Requests */}
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

        {/* Action Button (Shadcn Profile Dropdown) */}
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center p-2 rounded-full text-white border border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/40 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-white/50">
                <CircleUserRound size={24} />
              </button>
            </DropdownMenuTrigger>
            
            {/* side="top" forces the menu to open upwards from the bottom navbar */}
            <DropdownMenuContent side="top" align="end" className="w-56 mb-4 rounded-xl shadow-xl border-gray-100">
              <DropdownMenuLabel className="font-normal bg-gray-50/50 -mx-1 -mt-1 p-3 rounded-t-xl border-b border-gray-100">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-gray-800 leading-none truncate">
                    {user?.name || "User Profile"}
                  </p>
                  <p className="text-xs text-gray-500 leading-none truncate">
                    {user?.role || "STUDENT"}
                  </p>
                </div>
              </DropdownMenuLabel>
              
              <div className="p-1">
                <DropdownMenuItem 
                  className="cursor-pointer rounded-lg hover:bg-gray-100 transition-colors py-2"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50 transition-colors py-2"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
      </div>
    </header>
  );
};

export default Navbar;