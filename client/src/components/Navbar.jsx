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
  NotebookPen,
  FlaskConical,
  ScanQrCode,
  ListChecks,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Profile from "@/components/Profile";

const Navbar = ({ selectedPage, setSelectedPage, isLocked }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const API_URL = import.meta.env.VITE_API_URL;

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/logout`, {
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
    flex flex-col items-center px-1 sm:px-4 py-1 rounded-full transition-all duration-300 ease-out cursor-pointer select-none
    ${
      selectedPage === pageName
        ? "text-navy font-semibold"
        : "text-navy hover:text-white/80 active:scale-95"
    }
  `;

  const getIconClass = (pageName) => `
    p-1.5 sm:p-2 rounded-lg transition-all duration-300 flex items-center justify-center
    ${
      selectedPage === pageName
        ? "bg-blue/60 text-white shadow-inner border border-white/20 scale-105"
        : "hover:bg-blue/20 hover:text-white border border-transparent"
    }
  `;

  const iconClasses = "w-5 h-5 sm:w-6 sm:h-6";
  const labelClasses = "text-[9px] sm:text-xs mt-1 hidden sm:block";

  return (
    <header className="fixed bottom-0 left-0 right-0 z-50 p-2 sm:p-4 w-full flex justify-center">
      <div className="w-full max-w-6xl flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-1 rounded-2xl border border-navy/10 bg-blue/40 backdrop-blur-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="text-xl font-bold tracking-wider text-white">
            ALAB
          </span>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 md:flex-none flex items-center justify-around sm:justify-center gap-1 sm:gap-2 rounded-full overflow-x-auto no-scrollbar">
          {/* Dashboard */}
          {user?.role !== "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("dashboard")}
              onClick={() => setSelectedPage("dashboard")}
            >
              <div className={getIconClass("dashboard")}>
                <LayoutDashboard className={iconClasses} />
              </div>
              <span className={labelClasses}>Dashboard</span>
            </div>
          )}

          {/* Home */}
          {user?.role === "STUDENT" && !isLocked && (
            <div
              role="button"
              className={getMenuItemClass("home")}
              onClick={() => setSelectedPage("home")}
            >
              <div className={getIconClass("home")}>
                <House className={iconClasses} />
              </div>
              <span className={labelClasses}>Home</span>
            </div>
          )}

          {/* ASSIGNMENT */}
          {user?.role === "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("assignments")}
              onClick={() => setSelectedPage("assignments")}
            >
              <div className={getIconClass("assignments")}>
                <NotebookPen className={iconClasses} />
              </div>
              <span className={labelClasses}>Assignment</span>
            </div>
          )}

          {/* Experiments */}
          {user?.role === "FACULTY" && (
            <div
              role="button"
              className={getMenuItemClass("experiments")}
              onClick={() => setSelectedPage("experiments")}
            >
              <div className={getIconClass("experiments")}>
                <Microscope className={iconClasses} />
              </div>
              <span className={labelClasses}>Experiments</span>
            </div>
          )}

          {/* Wiki */}
          {user?.role === "STUDENT" && (
            <div
              role="button"
              className={getMenuItemClass("wiki")}
              onClick={() => setSelectedPage("wiki")}
            >
              <div className={getIconClass("wiki")}>
                <FlaskConical className={iconClasses} />
              </div>
              <span className={labelClasses}>Wiki</span>
            </div>
          )}

          {/* Users */}
          {user?.role === "ADMIN" && (
            <div
              role="button"
              className={getMenuItemClass("users")}
              onClick={() => setSelectedPage("users")}
            >
              <div className={getIconClass("users")}>
                <UsersRound className={iconClasses} />
              </div>
              <span className={labelClasses}>Users</span>
            </div>
          )}

          {/* Inventory */}
          {user?.role === "ADMIN" && (
            <div
              role="button"
              className={getMenuItemClass("inventory")}
              onClick={() => setSelectedPage("inventory")}
            >
              <div className={getIconClass("inventory")}>
                <ShelvingUnit className={iconClasses} />
              </div>
              <span className={labelClasses}>Inventory</span>
            </div>
          )}

          {/* Requests */}
          {user?.role === "FACULTY" && (
            <div
              role="button"
              className={getMenuItemClass("requests")}
              onClick={() => setSelectedPage("requests")}
            >
              <div className={getIconClass("requests")}>
                <BookPlus className={iconClasses} />
              </div>
              <span className={labelClasses}>Requests</span>
            </div>
          )}

          {/* Booking */}
          {user?.role === "ADMIN" && (
            <div
              role="button"
              className={getMenuItemClass("booking")}
              onClick={() => setSelectedPage("booking")}
            >
              <div className={getIconClass("booking")}>
                <BookPlus className={iconClasses} />
              </div>
              <span className={labelClasses}>Booking</span>
            </div>
          )}

          {/* Safety Gate */}
          {user?.role === "FACULTY" && (
            <div
              role="button"
              className={getMenuItemClass("safegate")}
              onClick={() => setSelectedPage("safegate")}
            >
              <div className={getIconClass("safegate")}>
                <DoorClosedLocked className={iconClasses} />
              </div>
              <span className={labelClasses}>Safety Gate</span>
            </div>
          )}

          {/* Scanner */}
          {user?.role === "FACULTY" && (
            <div
              role="button"
              className={getMenuItemClass("scanner")}
              onClick={() => setSelectedPage("scanner")}
            >
              <div className={getIconClass("scanner")}>
                <ScanQrCode className={iconClasses} />
              </div>
              <span className={labelClasses}>Scanner</span>
            </div>
          )}

          {/* List */}
          {user?.role === "FACULTY" && (
            <div
              role="button"
              className={getMenuItemClass("list")}
              onClick={() => setSelectedPage("list")}
            >
              <div className={getIconClass("list")}>
                <ListChecks className={iconClasses} />
              </div>
              <span className={labelClasses}>List</span>
            </div>
          )}
        </nav>

        {/* Profile Sheet */}
        <div className="flex-shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center justify-center p-1.5 sm:p-2 rounded-full text-white border border-white/20 bg-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/40 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none focus:ring-2 focus:ring-white/50">
                <CircleUserRound className={iconClasses} />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[85vw] max-w-[400px] sm:w-[540px] bg-white overflow-y-auto flex flex-col"
            >
              <div className="flex-1 mt-6">
                <Profile />
              </div>
              <div className="mx-4 border-t border-gray-100 pb-4 mt-auto pt-4">
                <Button
                  variant="destructive"
                  className="w-full justify-start h-12 text-md font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700 shadow-none"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
