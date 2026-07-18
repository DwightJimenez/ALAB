import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  // --- Search & Pagination State ---
  const [searchQuery, setSearchQuery] = useState("");
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

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
        method: "PUT", // Adjust to PATCH if your backend uses that
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

  // --- Delete Logic ---
  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (e) => {
    e.preventDefault(); // Prevent modal from closing before API call finishes
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

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.role && user.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  if (loading) return <div className="p-10 text-center">Loading users...</div>;

  return (
    <div className="p-6 m-6 text-navy w-full relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight">
          Manage System Users
        </h2>

        <div className="flex items-center gap-4">
          <Input
            type="text"
            placeholder="Search name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-blue-500/10 backdrop-blur-md border border-blue-500/30 shadow-[0_4px_20px_rgba(234,179,8,0.15)]"
          />

          {/* CREATE USER DIALOG */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                + Add New User
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-navy">
                  Create New User
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Full Name</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Email Address</label>
                  <Input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">System Role</label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENT">Student</SelectItem>
                      <SelectItem value="FACULTY">Faculty</SelectItem>
                      <SelectItem value="TECHNICIAN">Technician</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Year & Section</label>
                  <div className="flex space-x-2">
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Year Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Grade 7</SelectItem>
                        <SelectItem value="8">Grade 8</SelectItem>
                        <SelectItem value="9">Grade 9</SelectItem>
                        <SelectItem value="10">Grade 10</SelectItem>
                        <SelectItem value="11">Grade 11</SelectItem>
                        <SelectItem value="12">Grade 12</SelectItem>
                        <SelectItem value="College">College</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Section"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">Temporary Password</label>
                  <Input
                    required
                    className="bg-slate-50"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">
                    Copy and send this password to the new user.
                  </p>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Create User
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/30 shadow-[0_4px_20px_rgba(234,179,8,0.15)] p-6 rounded-lg">
        <Table className="w-full overflow-hidden border border-white mb-6 bg-white/50">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {searchQuery
                    ? "No users match your search."
                    : "No users found in the database."}
                </TableCell>
              </TableRow>
            ) : (
              currentUsers.map((user) => (
                <TableRow key={user.id} className="border-b border-white/50">
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full 
                      ${
                        user.role === "ADMIN"
                          ? "bg-red-100 text-red-700"
                          : user.role === "FACULTY"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>{user.year || "-"}</TableCell>
                  <TableCell>{user.section || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(user)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(user)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 ml-2"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* SHADCN PAGINATION CONTROLS */}
        {totalPages > 0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
                  }}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {/* Generate Page Numbers */}
              {[...Array(totalPages)].map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(i + 1);
                    }}
                    isActive={currentPage === i + 1}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages)
                      setCurrentPage((prev) => prev + 1);
                  }}
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* EDIT USER DIALOG */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-navy">Edit User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Full Name</label>
              <Input
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Email Address</label>
              <Input
                type="email"
                required
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">System Role</label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="FACULTY">Faculty</SelectItem>
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Year & Section</label>
              <div className="flex space-x-2">
                <Select
                  value={editFormData.year}
                  onValueChange={(value) => setEditFormData({ ...editFormData, year: value })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Year Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Grade 7</SelectItem>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                    <SelectItem value="College">College</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Section"
                  value={editFormData.section}
                  onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700">
              Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default ManageUsers;