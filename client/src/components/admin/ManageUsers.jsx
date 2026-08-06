import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  ShieldAlert,
  GraduationCap,
  Wrench,
  User as UserIcon,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// --- SHADCN PAGINATION IMPORTS ---
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import LogoLoader from "../LogoLoader";

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  // --- Create Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "STUDENT",
    password: "Alab2026!",
    year: "",
    section: "",
  });

  // --- Edit & Delete State ---
  const [selectedUser, setSelectedUser] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
    year: "",
    section: "",
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- BULK SELECTION & DELETE STATE ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // --- Search, Sort & Pagination State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 8;

  // --- Fetch Users ---
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch users");
      setUsers(data);
    } catch (err) {
      toast.error("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset to first page and clear selections when search/sort query changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, sortOrder]);

  // --- Create Logic ---
  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create user");
        return;
      }

      toast.success("User created successfully!");
      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        role: "STUDENT",
        password: "Alab2026!",
        year: "",
        section: "",
      });
      fetchUsers();
    } catch (err) {
      toast.error("Failed to connect to server.");
    }
  };

  // --- Edit Logic ---
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      year: user.year || "",
      section: user.section || "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editFormData),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update user");
        return;
      }

      toast.success("User updated successfully!");
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to connect to server.");
    }
  };

  // --- Single Delete Logic ---
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to delete user");
        return;
      }

      toast.success("User deleted successfully!");
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      toast.error("Failed to connect to server.");
    }
  };

  // --- Bulk Delete Logic ---
  const handleBulkDeleteConfirm = async (e) => {
    e.preventDefault();
    setIsDeletingBulk(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API_URL}/api/users/${id}`, {
            method: "DELETE",
            credentials: "include",
          }),
        ),
      );

      toast.success(`Successfully deleted ${selectedIds.length} users!`);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]); // Clear selection after successful deletion
      fetchUsers();
    } catch (err) {
      toast.error("An error occurred while deleting users.");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // --- Process Users: Filter out Admin ID 1, Search & Sort ---
  let processedUsers = users
    .filter((user) => String(user.id) !== "1") // Exclude user where ID is 1
    .filter(
      (user) =>
        (user.name &&
          user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.role &&
          user.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.section &&
          user.section.toLowerCase().includes(searchQuery.toLowerCase())),
    );

  // Apply Ascending/Descending Sort
  processedUsers.sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";

    if (sortOrder === "asc") {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  // --- Checkbox Handlers ---
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(processedUsers.map((user) => user.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // --- UI Helpers ---
  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className='flex w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold uppercase tracking-wider border border-rose-200'>
            <ShieldAlert className='w-3 h-3' /> Admin
          </span>
        );
      case "FACULTY":
        return (
          <span className='flex w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200'>
            <GraduationCap className='w-3 h-3' /> Faculty
          </span>
        );
      case "TECHNICIAN":
        return (
          <span className='flex w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200'>
            <Wrench className='w-3 h-3' /> Technician
          </span>
        );
      default:
        return (
          <span className='flex w-fit items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200'>
            <UserIcon className='w-3 h-3' /> Student
          </span>
        );
    }
  };

  // --- Pagination calculations ---
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = processedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(processedUsers.length / usersPerPage);

  // Exact math for item counters
  const totalUsersCount = processedUsers.length;
  const startItem = totalUsersCount === 0 ? 0 : indexOfFirstUser + 1;
  const endItem = Math.min(indexOfLastUser, totalUsersCount);

  if (loading)
    return (
      <div className='w-full h-full justify-center items-center '>
        <LogoLoader size='sm' />;
      </div>
    );

  return (
    <div className='p-3 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6'>
      {/* HEADER SECTION */}
      <div className='flex flex-col gap-4'>
        <div>
          <h2 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900'>
            Users
          </h2>
          <p className='text-xs sm:text-sm text-slate-500 mt-0.5'>
            Manage system accounts, roles, and access.
          </p>
        </div>

        <div className='flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full'>
          {/* SEARCH BAR */}
          <div className='relative w-full sm:w-64'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
            <Input
              type='text'
              placeholder='Search users...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500 text-sm'
            />
          </div>

          {/* SORT & ACTION BUTTONS WRAPPER */}
          <div className='flex items-center gap-2 w-full sm:w-auto'>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className='h-10 flex-1 sm:flex-none sm:w-[170px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-all hover:bg-slate-50'
            >
              <option value='asc'>Ascending (A-Z)</option>
              <option value='desc'>Descending (Z-A)</option>
            </select>

            {selectedIds.length > 0 && (
              <Button
                variant='destructive'
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className='shadow-sm text-xs sm:text-sm px-3'
              >
                <Trash2 className='w-3.5 h-3.5 sm:mr-1.5' />
                <span className='hidden sm:inline'>Delete</span> (
                {selectedIds.length})
              </Button>
            )}

            {/* CREATE USER DIALOG */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all text-xs sm:text-sm px-3 sm:px-4 ml-auto sm:ml-0'>
                  <Plus className='w-4 h-4 mr-1 sm:mr-1.5' /> Add User
                </Button>
              </DialogTrigger>

              <DialogContent className='w-[92vw] max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg'>
                <DialogHeader>
                  <DialogTitle className='text-lg sm:text-xl text-slate-900'>
                    Add New User
                  </DialogTitle>
                  <p className='text-xs sm:text-sm text-slate-500 mt-1'>
                    Enter credentials and system role for the new account.
                  </p>
                </DialogHeader>

                <form onSubmit={handleCreateUser} className='space-y-3.5 mt-2'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      Full Name
                    </label>
                    <Input
                      required
                      placeholder='John Doe'
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      Email Address
                    </label>
                    <Input
                      type='email'
                      required
                      placeholder='john@example.com'
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      System Role
                    </label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select a role' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='STUDENT'>Student</SelectItem>
                        <SelectItem value='FACULTY'>Faculty</SelectItem>
                        <SelectItem value='TECHNICIAN'>Technician</SelectItem>
                        <SelectItem value='ADMIN'>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      Year & Section
                    </label>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                      <Select
                        value={formData.year}
                        onValueChange={(value) =>
                          setFormData({ ...formData, year: value })
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Year Level' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='7'>Grade 7</SelectItem>
                          <SelectItem value='8'>Grade 8</SelectItem>
                          <SelectItem value='9'>Grade 9</SelectItem>
                          <SelectItem value='10'>Grade 10</SelectItem>
                          <SelectItem value='11'>Grade 11</SelectItem>
                          <SelectItem value='12'>Grade 12</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder='Section (e.g. A)'
                        value={formData.section}
                        onChange={(e) =>
                          setFormData({ ...formData, section: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className='space-y-1.5 pt-1'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      Temporary Password
                    </label>
                    <Input
                      required
                      className='bg-slate-50 font-mono text-sm'
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                    />
                    <p className='text-[11px] text-slate-500 leading-tight'>
                      Provide this temporary password to the user.
                    </p>
                  </div>
                  <div className='flex justify-end space-x-2 pt-4'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type='submit'
                      className='bg-indigo-600 hover:bg-indigo-700 text-white'
                    >
                      Create User
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* TABLE CONTAINER - SCROLLABLE FOR MOBILE */}
      <div className='bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden'>
        <div className='overflow-x-auto w-full'>
          <Table className='w-full min-w-[600px]'>
            <TableHeader className='bg-slate-50/80 border-b border-slate-200'>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='w-[45px] text-center pl-3 sm:pl-4'>
                  <Checkbox
                    checked={
                      processedUsers.length > 0 &&
                      selectedIds.length === processedUsers.length
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label='Select all rows'
                    className='border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600'
                  />
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10'>
                  Name
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10'>
                  Email
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10'>
                  Role
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10'>
                  Year
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10'>
                  Section
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10 text-right pr-4 sm:pr-6'>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='h-56 text-center'>
                    <div className='flex flex-col items-center justify-center text-slate-500 space-y-2'>
                      <div className='w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center'>
                        <Users className='w-5 h-5 text-slate-400' />
                      </div>
                      <div>
                        <p className='text-sm font-medium text-slate-900'>
                          No users found
                        </p>
                        <p className='text-xs'>
                          {searchQuery
                            ? "No matching users found for your search."
                            : "Your user database is currently empty."}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${selectedIds.includes(user.id) ? "bg-indigo-50/30" : ""}`}
                  >
                    <TableCell className='text-center pl-3 sm:pl-4'>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => handleSelectOne(user.id)}
                        aria-label={`Select ${user.name}`}
                        className='border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600'
                      />
                    </TableCell>
                    <TableCell>
                      <span className='font-semibold text-slate-900 text-xs sm:text-sm'>
                        {user.name}
                      </span>
                    </TableCell>
                    <TableCell className='text-slate-500 text-xs sm:text-sm'>
                      {user.email}
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className='text-slate-600 font-medium text-xs sm:text-sm'>
                      {user.year || "—"}
                    </TableCell>
                    <TableCell className='text-slate-600 font-medium text-xs sm:text-sm'>
                      {user.section || "—"}
                    </TableCell>
                    <TableCell className='text-right pr-3 sm:pr-4'>
                      <div className='flex justify-end gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => openEditModal(user)}
                          className='h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        >
                          <Edit2 className='w-3.5 h-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => openDeleteModal(user)}
                          className='h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalPages > 0 && (
          <div className='flex flex-col sm:flex-row justify-between items-center gap-3 px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50/50'>
            {/* Added whitespace-nowrap here to prevent the text from breaking into two lines */}
            <div className='text-xs sm:text-sm text-slate-500 font-medium text-center sm:text-left whitespace-nowrap'>
              {selectedIds.length > 0 ? (
                <span className='text-indigo-600'>
                  {selectedIds.length} user(s) selected
                </span>
              ) : (
                <span>
                  Showing{" "}
                  <span className='font-semibold text-slate-900'>
                    {startItem}
                  </span>{" "}
                  to{" "}
                  <span className='font-semibold text-slate-900'>
                    {endItem}
                  </span>{" "}
                  of{" "}
                  <span className='font-semibold text-slate-900'>
                    {totalUsersCount}
                  </span>
                </span>
              )}
            </div>

            <Pagination className='justify-center sm:justify-end'>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href='#'
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage((prev) => prev - 1);
                    }}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-40"
                        : "cursor-pointer hover:bg-slate-200/50"
                    }
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href='#'
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(i + 1);
                      }}
                      isActive={currentPage === i + 1}
                      className={`cursor-pointer ${currentPage === i + 1 ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-transparent" : "hover:bg-slate-200/50"}`}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    href='#'
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        setCurrentPage((prev) => prev + 1);
                    }}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-40"
                        : "cursor-pointer hover:bg-slate-200/50"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className='w-[92vw] max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg'>
          <DialogHeader>
            <DialogTitle className='text-lg sm:text-xl text-slate-900'>
              Edit User
            </DialogTitle>
            <p className='text-xs sm:text-sm text-slate-500 mt-1'>
              Update details and permissions for this account.
            </p>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className='space-y-3.5 mt-2'>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                Full Name
              </label>
              <Input
                required
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                Email Address
              </label>
              <Input
                type='email'
                required
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                System Role
              </label>
              <Select
                value={editFormData.role}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a role' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='STUDENT'>Student</SelectItem>
                  <SelectItem value='FACULTY'>Faculty</SelectItem>
                  <SelectItem value='TECHNICIAN'>Technician</SelectItem>
                  <SelectItem value='ADMIN'>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                Year & Section
              </label>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                <Select
                  value={editFormData.year}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, year: value })
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Year Level' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='7'>Grade 7</SelectItem>
                    <SelectItem value='8'>Grade 8</SelectItem>
                    <SelectItem value='9'>Grade 9</SelectItem>
                    <SelectItem value='10'>Grade 10</SelectItem>
                    <SelectItem value='11'>Grade 11</SelectItem>
                    <SelectItem value='12'>Grade 12</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder='Section (e.g. A)'
                  value={editFormData.section}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      section: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className='flex justify-end space-x-2 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                className='bg-indigo-600 hover:bg-indigo-700 text-white'
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SINGLE DELETE CONFIRMATION */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent className='w-[92vw] max-w-[425px] p-4 sm:p-6 rounded-lg'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-rose-600 flex items-center gap-2 text-lg'>
              <ShieldAlert className='w-5 h-5' /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600 text-xs sm:text-sm pt-1'>
              Are you sure you want to delete{" "}
              <strong className='text-slate-900'>{selectedUser?.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-3'>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className='bg-rose-600 hover:bg-rose-700 text-white'
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BULK DELETE CONFIRMATION */}
      <AlertDialog
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
      >
        <AlertDialogContent className='w-[92vw] max-w-[425px] p-4 sm:p-6 rounded-lg'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-rose-600 flex items-center gap-2 text-lg'>
              <ShieldAlert className='w-5 h-5' /> Delete Selected Users
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600 text-xs sm:text-sm pt-1'>
              Are you sure you want to permanently delete{" "}
              <strong className='text-slate-900'>{selectedIds.length}</strong>{" "}
              user(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-3'>
            <AlertDialogCancel
              onClick={() => setIsBulkDeleteModalOpen(false)}
              disabled={isDeletingBulk}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              disabled={isDeletingBulk}
              className='bg-rose-600 hover:bg-rose-700 text-white'
            >
              {isDeletingBulk
                ? "Deleting..."
                : `Delete ${selectedIds.length} Users`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageUsers;
