import React, { useState } from "react";
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
  FileText,
  BookOpen,
  Home,
  Book,
  Library,
  BarChart2,
  Box,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Atom,
  Crown, // Added Crown for Special Requests
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

  // State for mobile left sidebar
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);

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

  // Updated to support special styling
  const getNavItemClass = (pageName, isSpecial) => {
    if (selectedPage === pageName) {
      return isSpecial
        ? "bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm"
        : "bg-[#401268] text-white";
    }
    return isSpecial
      ? "text-amber-600/80 hover:text-amber-700 hover:bg-amber-50/50"
      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50";
  };

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
                    data-tour={
                      user?.role === "FACULTY"
                        ? "faculty-dashboard"
                        : "admin-dashboard"
                    }
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
                        data-tour='faculty-experiments'
                      >
                        <Microscope />
                        <span>Experiments</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "grading"}
                        onClick={() => setSelectedPage("grading")}
                        data-tour='faculty-grading'
                      >
                        <FileCheckCorner />
                        <span>Grading</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "learning-materials"}
                        onClick={() => setSelectedPage("learning-materials")}
                      >
                        <FileText />
                        <span>Learning Materials</span>
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
                        data-tour='admin-users'
                      >
                        <UsersRound />
                        <span>Users</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "inventory"}
                        onClick={() => setSelectedPage("inventory")}
                        data-tour='admin-inventory'
                      >
                        <ShelvingUnit />
                        <span>Inventory</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "booking"}
                        onClick={() => setSelectedPage("booking")}
                        data-tour='admin-booking'
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
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={selectedPage === "special-requests"}
                        onClick={() => setSelectedPage("special-requests")}
                      >
                        <BookOpen />
                        <span>Special Requests</span>
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

  // --- Student Nav Items ---
  // Added `isDivider` for visual grouping and `isSpecial` for the Crown styling
  const mobileNavItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "learning", label: "Learning Materials", icon: BookOpen },
    { id: "logbook", label: "Logbook", icon: Book },
    { id: "assignments", label: "Assignment", icon: FileCheckCorner },

    // -- Tools Group --
    { id: "div1", isDivider: true },
    { id: "wiki", label: "Wiki", icon: Library },
    { id: "periodic-table", label: "Periodic Table", icon: Atom },
    { id: "sandbox", label: "Sandbox", icon: Box },
    { id: "div2", isDivider: true },

    {
      id: "special-requests",
      label: "Special Requests",
      icon: Crown,
      isSpecial: true,
    },
    { id: "help", label: "Help", icon: HelpCircle },
  ];

  return (
    <>
      <header className='fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm w-full supports-[backdrop-filter]:bg-white/60'>
        <div className='flex items-center justify-between px-4 sm:px-8 h-16 w-full max-w-[1600px] mx-auto'>
          <div className='flex items-center flex-shrink-0'>
            <img src='/alab-logo-3.svg' alt='LOGO' className='w-32 md:w-40' />
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className='hidden xl:flex flex-1 items-center justify-center gap-2'>
            {mobileNavItems.map((item) =>
              item.isDivider ? (
                <div key={item.id} className='w-px h-5 bg-gray-200 mx-1' />
              ) : (
                <div
                  key={item.id}
                  role='button'
                  data-tour={`student-${item.id}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors cursor-pointer select-none text-sm whitespace-nowrap ${getNavItemClass(item.id, item.isSpecial)}`}
                  onClick={() => setSelectedPage(item.id)}
                >
                  {item.isSpecial && <Crown className='w-4 h-4' />}
                  {item.label}
                  {item.id === "assignments" && notificationCount > 0 && (
                    <span className='flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white'>
                      {notificationCount}
                    </span>
                  )}
                </div>
              ),
            )}
          </nav>

          {/* Right: Notifications & Profile Sheet */}
          <div className='flex-shrink-0 ml-auto flex items-center gap-3 sm:gap-4'>
            <Sheet>
              <SheetTrigger asChild>
                <button className='flex items-center gap-2 p-1.5 rounded-full border border-gray-200 bg-violet-100 transition-all duration-300 hover:bg-white/80 hover:border-gray-300 '>
                  <Avatar size='lg'>
                    <AvatarImage src={user.avatar} alt='avatar' />
                    <AvatarFallback>
                      {user.name?.charAt(0) || "U"}
                    </AvatarFallback>
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

      {/* Mobile Collapsible Left Sidebar */}
      <nav
        className={`xl:hidden fixed top-16 left-0 bottom-0 z-40 bg-white border-r border-gray-200 shadow-sm transition-all duration-300 flex flex-col ${
          isMobileNavExpanded ? "w-64" : "w-16"
        }`}
      >
        {/* Toggle Button */}
        <div className='flex items-center justify-end p-2 border-b border-gray-100 min-h-[48px]'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsMobileNavExpanded(!isMobileNavExpanded)}
            className={`text-gray-500 hover:text-gray-900 ${!isMobileNavExpanded ? "mx-auto" : ""}`}
          >
            {isMobileNavExpanded ? (
              <ChevronLeft className='h-5 w-5' />
            ) : (
              <ChevronRight className='h-5 w-5' />
            )}
          </Button>
        </div>

        {/* Sidebar Links */}
        <div className='flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden'>
          {mobileNavItems.map((item) =>
            item.isDivider ? (
              <div key={item.id} className='h-px bg-gray-100 my-2 mx-4' />
            ) : (
              <div
                key={item.id}
                role='button'
                data-tour={`student-${item.id}`}
                className={`flex items-center px-4 py-3 cursor-pointer transition-colors whitespace-nowrap ${
                  selectedPage === item.id
                    ? item.isSpecial
                      ? "bg-amber-50 text-amber-700 border-r-4 border-amber-600"
                      : "bg-violet-100 text-[#401268] border-r-4 border-[#401268]"
                    : item.isSpecial
                      ? "text-amber-600/80 hover:bg-amber-50/50 hover:text-amber-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
                onClick={() => {
                  setSelectedPage(item.id);
                }}
              >
                <div className='relative flex items-center justify-center shrink-0'>
                  <item.icon
                    className={`h-6 w-6 ${
                      selectedPage === item.id
                        ? item.isSpecial
                          ? "text-amber-700"
                          : "text-[#401268]"
                        : item.isSpecial
                          ? "text-amber-600/80"
                          : "text-gray-400"
                    }`}
                  />
                  {item.id === "assignments" && notificationCount > 0 && (
                    <span className='absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border-2 border-white'>
                      {notificationCount}
                    </span>
                  )}
                </div>

                <span
                  className={`ml-4 text-sm font-medium transition-opacity duration-300 ${
                    isMobileNavExpanded ? "opacity-100" : "opacity-0 w-0 hidden"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ),
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
