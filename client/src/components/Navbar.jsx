import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/authSlice";
import {
  CircleUserRound,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Microscope,
  UsersRound,
  ShelvingUnit,
  BookPlus,
  DoorClosedLocked,
  ScanQrCode,
  ListChecks,
  Menu,
  FileCheckCorner,
  ClipboardList,
  UserCheck,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Profile from "@/components/Profile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navbar = ({ selectedPage, setSelectedPage }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const API_URL = import.meta.env.VITE_API_URL;

  let notificationCount = user?.pendingAssignmentsCount || 0;

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

  const isAdminOrFaculty = user?.role === "ADMIN" || user?.role === "FACULTY";

  const getNavItemClass = (pageName, isMobile = false) => `
    px-4 py-2 rounded-md font-medium transition-colors cursor-pointer select-none
    ${isMobile ? "text-base w-full text-left" : "text-sm whitespace-nowrap"}
    ${
      selectedPage === pageName
        ? "bg-[#401268] text-white"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"
    }
  `;

  if (isAdminOrFaculty) {
    return (
      <Sidebar>
        <SidebarHeader className='h-16 flex items-start justify-center px-6 border-b border-sidebar-border'>
          <img src='/alab-logo-3.svg' alt='LOGO' className='w-35 mx-auto' />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Dashboard (Both Admin & Faculty) */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={selectedPage === "dashboard"}
                    onClick={() => setSelectedPage("dashboard")}
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Faculty Menu Items */}
                {user?.role === "FACULTY" && (
                  <>
                    {/* --- CLASS MANAGEMENT --- */}
                    <li className='px-2 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      Class Management
                    </li>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "roster"}
                        onClick={() => setSelectedPage("roster")}
                      >
                        <ClipboardList />
                        <span>Class Record</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "attendance"}
                        onClick={() => setSelectedPage("attendance")}
                      >
                        <UserCheck />
                        <span>Class Attendance</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* --- ACADEMICS --- */}
                    <li className='px-2 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      Academics
                    </li>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "experiments"}
                        onClick={() => setSelectedPage("experiments")}
                      >
                        <Microscope />
                        <span>Experiments</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "grading"}
                        onClick={() => setSelectedPage("grading")}
                      >
                        <FileCheckCorner />
                        <span>Grading</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "criteria"}
                        onClick={() => setSelectedPage("criteria")}
                      >
                        <FileCheckCorner />
                        <span>Criteria Maker</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* --- LABORATORY & ACCESS --- */}
                    <li className='px-2 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                      Lab Access
                    </li>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "requests"}
                        onClick={() => setSelectedPage("requests")}
                      >
                        <BookPlus />
                        <span>Requests</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "safegate"}
                        onClick={() => setSelectedPage("safegate")}
                      >
                        <DoorClosedLocked />
                        <span>Safety Gate</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "scanner"}
                        onClick={() => setSelectedPage("scanner")}
                      >
                        <ScanQrCode />
                        <span>Scanner</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "list"}
                        onClick={() => setSelectedPage("list")}
                      >
                        <ListChecks />
                        <span>Gate Passed List</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}

                {/* Admin Menu Items */}
                {user?.role === "ADMIN" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "users"}
                        onClick={() => setSelectedPage("users")}
                      >
                        <UsersRound />
                        <span>Users</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "inventory"}
                        onClick={() => setSelectedPage("inventory")}
                      >
                        <ShelvingUnit />
                        <span>Inventory</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "booking"}
                        onClick={() => setSelectedPage("booking")}
                      >
                        <BookPlus />
                        <span>Booking</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "manage-faculty-sections"}
                        onClick={() =>
                          setSelectedPage("manage-faculty-sections")
                        }
                      >
                        <BookPlus />
                        <span>Manage Faculty Sections</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <Sheet>
                <SheetTrigger asChild>
                  <SidebarMenuButton
                    size='lg'
                    className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                  >
                    <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                      <CircleUserRound className='size-4' />
                    </div>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-semibold'>
                        {user?.name || "Account"}
                      </span>
                      <span className='truncate text-xs'>{user?.role}</span>
                    </div>
                    <ChevronDown className='ml-auto size-4' />
                  </SidebarMenuButton>
                </SheetTrigger>

                <SheetContent
                  side='right'
                  className='w-[85vw] max-w-[400px] sm:w-[540px] overflow-y-auto flex flex-col'
                >
                  <div className='flex-1 mt-6 '>
                    <Profile />
                  </div>
                  <div className='mx-4 border-t border-gray-100 pb-4 mt-auto pt-4'>
                    <Button
                      variant='destructive'
                      className='w-full justify-start h-12 text-md font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700 shadow-none'
                      onClick={handleLogout}
                    >
                      <LogOut className='mr-3 h-5 w-5' />
                      Log Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    );
  }

  return (
    <header className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm w-full supports-[backdrop-filter]:bg-white/60'>
      <div className='flex items-center justify-between px-4 sm:px-8 h-16 w-full max-w-[1600px] mx-auto'>
        {/* Left: Mobile Menu & Logo */}
        <div className='flex items-center gap-2 md:gap-6'>
          {/* Mobile Hamburger Menu */}
          <div className='md:hidden'>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant='ghost' size='icon' className='-ml-2'>
                  <Menu className='h-6 w-6 text-gray-700' />
                  {/* Optional mobile menu indicator */}
                  {notificationCount > 0 && (
                    <span className='absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 border-2 border-white'></span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side='left'
                className='w-[280px] bg-white flex flex-col'
              >
                <div className='mt-6 mb-8 flex justify-center border-b pb-6'>
                  <img src='/alab-logo-3.svg' alt='LOGO' className='w-40' />
                </div>
                <nav className='flex flex-col gap-3 mx-8'>
                  <SheetClose asChild>
                    <div
                      role='button'
                      className={getNavItemClass("home", true)}
                      onClick={() => setSelectedPage("home")}
                    >
                      Home
                    </div>
                  </SheetClose>

                  <SheetClose asChild>
                    <div
                      role='button'
                      className={`${getNavItemClass("assignments", true)} flex justify-between items-center`}
                      onClick={() => setSelectedPage("assignments")}
                    >
                      <span>Assignment</span>
                      {notificationCount > 0 && (
                        <span className='flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white'>
                          {notificationCount}
                        </span>
                      )}
                    </div>
                  </SheetClose>
                  <SheetClose asChild>
                    <div
                      role='button'
                      className={getNavItemClass("wiki", true)}
                      onClick={() => setSelectedPage("wiki")}
                    >
                      Wiki
                    </div>
                  </SheetClose>
                  <SheetClose asChild>
                    <div
                      role='button'
                      className={getNavItemClass("stats")}
                      onClick={() => setSelectedPage("stats")}
                    >
                      Stats
                    </div>
                  </SheetClose>
                  <SheetClose asChild>
                    <div
                      role='button'
                      className={getNavItemClass("sandbox")}
                      onClick={() => setSelectedPage("sandbox")}
                    >
                      Sandbox
                    </div>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <div className='flex items-center flex-shrink-0'>
            <img src='/alab-logo-3.svg' alt='LOGO' className='w-32 md:w-40' />
          </div>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className='hidden md:flex flex-1 items-center justify-center gap-2'>
          <div
            role='button'
            className={getNavItemClass("home")}
            onClick={() => setSelectedPage("home")}
          >
            Home
          </div>
          <div
            role='button'
            className={`${getNavItemClass("assignments")} flex items-center gap-2`}
            onClick={() => setSelectedPage("assignments")}
          >
            Assignment
            {/* Desktop assignment notification */}
            {notificationCount > 0 && (
              <span className='flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white'>
                {notificationCount}
              </span>
            )}
          </div>
          <div
            role='button'
            className={getNavItemClass("wiki")}
            onClick={() => setSelectedPage("wiki")}
          >
            Wiki
          </div>
          <div
            role='button'
            className={getNavItemClass("stats")}
            onClick={() => setSelectedPage("stats")}
          >
            Stats
          </div>
          <div
            role='button'
            className={getNavItemClass("sandbox")}
            onClick={() => setSelectedPage("sandbox")}
          >
            Sandbox
          </div>
        </nav>

        {/* Right: Notifications & Profile Sheet */}
        <div className='flex-shrink-0 ml-auto flex items-center gap-3 sm:gap-4'>
          <Sheet>
            <SheetTrigger asChild>
              <button className='flex items-center gap-2 p-1.5 rounded-full border border-gray-200 bg-violet-100 transition-all duration-300 hover:bg-white/80 hover:border-gray-300 '>
                <Avatar size='lg'>
                  <AvatarImage src={user.avatar} alt='avatar' />
                  <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </button>
            </SheetTrigger>

            <SheetContent
              side='right'
              className='w-[85vw] max-w-[400px] sm:w-[540px] bg-violet-100 overflow-y-auto flex flex-col'
            >
              <div className='flex-1 mt-6'>
                <Profile />
              </div>
              <div className='mx-4 border-t border-gray-100 pb-4 mt-auto pt-4'>
                <Button
                  variant='destructive'
                  className='w-full justify-start h-12 text-md font-medium bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700 shadow-none'
                  onClick={handleLogout}
                >
                  <LogOut className='mr-3 h-5 w-5' />
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
