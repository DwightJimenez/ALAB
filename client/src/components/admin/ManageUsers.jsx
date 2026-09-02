import React, { useState, useEffect, useRef } from "react";
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
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  CircleDashed,
  Download,
  UploadCloud,
  ArrowRight,
  AlertCircle,
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
  DialogFooter,
  DialogDescription,
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx"; // Kept for reading uploads
import ExcelJS from "exceljs"; // Added for creating true dropdowns
import { saveAs } from "file-saver"; // Added for downloading the file
import LogoLoader from "../LogoLoader";

// --- Utility Functions for Phone Number ---
const formatPhoneNumber = (value) => {
  if (!value) return "";
  let raw = value.replace(/\D/g, "");

  // Enforce starting with "09"
  if (raw.length === 1 && raw !== "0") {
    raw = "09" + raw;
  } else if (raw.length >= 2 && !raw.startsWith("09")) {
    raw = "09" + raw.substring(raw.startsWith("0") ? 1 : 0);
  }

  raw = raw.substring(0, 11);

  if (raw.length > 7) {
    return `${raw.substring(0, 4)}-${raw.substring(4, 7)}-${raw.substring(7, 11)}`;
  } else if (raw.length > 4) {
    return `${raw.substring(0, 4)}-${raw.substring(4)}`;
  }
  return raw;
};

const unformatPhoneNumber = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  // --- Initial Form States ---
  const initialFormState = {
    name: "",
    email: "",
    role: "STUDENT",
    password: "Alab2026!",
    year: "",
    section: "",
    sex: "",
    phoneNumber: "",
  };

  // --- Create Form State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [addedUserResult, setAddedUserResult] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  // --- Edit & Delete State ---
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(initialFormState);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- Bulk Selection & Delete State ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // --- WIZARD: Bulk Import State ---
  const fileInputRef = useRef(null);
  const importListRef = useRef(null);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  // Steps: 'upload' -> 'preview' -> 'importing' -> 'complete'
  const [wizardStep, setWizardStep] = useState("upload");

  const [bulkImportData, setBulkImportData] = useState([]);
  const [importStatuses, setImportStatuses] = useState([]);
  const [importProgress, setImportProgress] = useState(0);

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

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, sortOrder]);

  // Scroll to active importing item
  useEffect(() => {
    if (importListRef.current && wizardStep === "importing") {
      const activeElement = importListRef.current.querySelector(
        '[data-status="loading"]',
      );
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [importProgress, wizardStep]);

  // --- Create Logic ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsCreatingUser(true);

    const payload = {
      ...formData,
      phoneNumber: unformatPhoneNumber(formData.phoneNumber),
    };

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create user");
        setIsCreatingUser(false);
        return;
      }

      toast.success(`Successfully added ${formData.name}!`, {
        description: `Account created with email: ${formData.email}`,
      });

      fetchUsers();
      setIsModalOpen(false);
      setAddedUserResult({
        name: formData.name,
        email: formData.email,
        role: formData.role,
      });
      setFormData(initialFormState);
    } catch (err) {
      toast.error("Failed to connect to server.");
    } finally {
      setIsCreatingUser(false);
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
      sex: user.sex || "",
      phoneNumber: formatPhoneNumber(user.phoneNumber || ""),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...editFormData,
      phoneNumber: unformatPhoneNumber(editFormData.phoneNumber),
    };

    try {
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update user");
        return;
      }

      toast.success(`User ${editFormData.name} updated successfully!`);
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
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      toast.error("An error occurred while deleting users.");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // --- WIZARD: Bulk Import Flow with ExcelJS for Dropdowns ---
  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Users_Template");

      // Set columns
      worksheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Role", key: "role", width: 15 },
        { header: "Year", key: "year", width: 10 },
        { header: "Section", key: "section", width: 20 },
        { header: "Sex", key: "sex", width: 15 },
        { header: "Phone", key: "phone", width: 20 },
      ];

      // Add example rows
      worksheet.addRow({
        name: "Juan Dela Cruz",
        email: "juan@example.com",
        role: "STUDENT",
        year: "12",
        section: "STEM MATH",
        sex: "Male",
        phone: "0912-345-6789",
      });

      // Apply true Excel Data Validation (dropdowns) for up to 1000 rows
      for (let i = 2; i <= 1000; i++) {
        // Role (Col C)
        worksheet.getCell(`C${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"STUDENT,FACULTY,TECHNICIAN,ADMIN"'],
        };
        // Year (Col D)
        worksheet.getCell(`D${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"11,12"'],
        };
        // Section (Col E)
        worksheet.getCell(`E${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"STEM A,STEM B,STEM MATH,STEM SCIENCE"'],
        };
        // Sex (Col F)
        worksheet.getCell(`F${i}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"Male,Female"'],
        };
      }

      // Output the file to the browser
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "User_Import_Template.xlsx");
      toast.success("Template with dropdowns downloaded successfully!");
    } catch (error) {
      toast.error("Failed to generate template.");
      console.error(error);
    }
  };

  const resetWizard = () => {
    setIsWizardOpen(false);
    setTimeout(() => {
      setWizardStep("upload");
      setBulkImportData([]);
      setImportStatuses([]);
      setImportProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 300);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const mappedUsers = [];

        jsonData.forEach((row, index) => {
          const keys = Object.keys(row);
          const nameKey = keys.find((k) =>
            String(k).toLowerCase().replace(/\s+/g, "").includes("name"),
          );
          const emailKey = keys.find((k) =>
            String(k).toLowerCase().replace(/\s+/g, "").includes("email"),
          );
          const roleKey = keys.find((k) =>
            String(k).toLowerCase().replace(/\s+/g, "").includes("role"),
          );
          const yearKey = keys.find((k) =>
            String(k).toLowerCase().replace(/\s+/g, "").includes("year"),
          );
          const sectionKey = keys.find((k) =>
            String(k).toLowerCase().replace(/\s+/g, "").includes("section"),
          );
          const sexKey = keys.find((k) =>
            String(k)
              .toLowerCase()
              .replace(/\s+/g, "")
              .match(/sex|gender/),
          );
          const phoneKey = keys.find((k) =>
            String(k).toLowerCase().replace(/\s+/g, "").includes("phone"),
          );

          let parsedRole = roleKey
            ? String(row[roleKey]).toUpperCase().trim()
            : "STUDENT";
          if (
            !["STUDENT", "FACULTY", "TECHNICIAN", "ADMIN"].includes(parsedRole)
          ) {
            parsedRole = "STUDENT";
          }

          let parsedSex = "";
          if (sexKey) {
            const rawSex = String(row[sexKey]).toLowerCase().trim();
            if (rawSex === "m" || rawSex === "male") parsedSex = "Male";
            if (rawSex === "f" || rawSex === "female") parsedSex = "Female";
          }

          let parsedYear = yearKey ? String(row[yearKey]).trim() : "";
          if (!["11", "12"].includes(parsedYear)) parsedYear = "";

          let parsedSection = sectionKey
            ? String(row[sectionKey]).toUpperCase().trim()
            : "";
          if (
            !["STEM A", "STEM B", "STEM MATH", "STEM SCIENCE"].includes(
              parsedSection,
            )
          )
            parsedSection = "";

          const rawName = nameKey ? String(row[nameKey]).trim() : "";
          const rawEmail = emailKey ? String(row[emailKey]).trim() : "";
          const rawPhone = phoneKey ? String(row[phoneKey]).trim() : "";

          const isValid =
            rawName !== "" && rawEmail !== "" && rawEmail.includes("@");

          mappedUsers.push({
            id: index,
            name: rawName,
            email: rawEmail,
            role: parsedRole,
            password: "Alab2026!",
            year: parsedYear,
            section: parsedSection,
            sex: parsedSex,
            phoneNumber: formatPhoneNumber(rawPhone),
            isValid: isValid,
            status: "pending",
          });
        });

        if (mappedUsers.length === 0) {
          toast.error("The uploaded file is empty or formatted incorrectly.");
          return;
        }

        setBulkImportData(mappedUsers);
        setImportStatuses(mappedUsers);
        setWizardStep("preview");
      } catch (err) {
        toast.error("Failed to parse Excel file.");
      } finally {
        if (e.target) e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleStartImport = async () => {
    const validUsersToImport = bulkImportData.filter((u) => u.isValid);

    if (validUsersToImport.length === 0) {
      toast.error("No valid users to import.");
      return;
    }

    setWizardStep("importing");
    setImportProgress(0);

    for (let i = 0; i < bulkImportData.length; i++) {
      if (!bulkImportData[i].isValid) continue;

      setImportStatuses((prev) =>
        prev.map((u, idx) => (idx === i ? { ...u, status: "loading" } : u)),
      );

      let isSuccess = false;
      try {
        const payload = { ...bulkImportData[i] };
        payload.phoneNumber = unformatPhoneNumber(payload.phoneNumber); // Strip hyphens for backend

        delete payload.isValid;
        delete payload.id;
        delete payload.status;

        const response = await fetch(`${API_URL}/api/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (response.ok) isSuccess = true;
      } catch (err) {
        isSuccess = false;
      }

      setImportStatuses((prev) =>
        prev.map((u, idx) =>
          idx === i ? { ...u, status: isSuccess ? "success" : "failed" } : u,
        ),
      );

      setImportProgress(Math.round(((i + 1) / bulkImportData.length) * 100));
    }

    setWizardStep("complete");
    fetchUsers();
  };

  // --- Process Users Table Filter/Sort ---
  let processedUsers = users
    .filter((user) => String(user.id) !== "1") // Assuming ID 1 is super admin
    .filter(
      (user) =>
        (user.name &&
          user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email &&
          user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.role &&
          user.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.section &&
          user.section.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.phoneNumber &&
          user.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase())),
    );

  processedUsers.sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";
    return sortOrder === "asc"
      ? nameA.localeCompare(nameB)
      : nameB.localeCompare(nameA);
  });

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

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = processedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(processedUsers.length / usersPerPage);
  const totalUsersCount = processedUsers.length;
  const startItem = totalUsersCount === 0 ? 0 : indexOfFirstUser + 1;
  const endItem = Math.min(indexOfLastUser, totalUsersCount);

  if (loading)
    return (
      <div className='w-full min-h-[60vh] flex flex-col justify-center items-center gap-3'>
        <LogoLoader size='sm' />
      </div>
    );

  const validRowsCount = bulkImportData.filter((u) => u.isValid).length;
  const invalidRowsCount = bulkImportData.length - validRowsCount;

  return (
    <div className='p-3 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-4 sm:space-y-6'>
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

          <div className='flex items-center gap-2 w-full sm:w-auto ml-auto'>
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

            {/* --- UNIFIED BULK IMPORT WIZARD --- */}
            <Dialog
              open={isWizardOpen}
              onOpenChange={(open) => {
                if (
                  !open &&
                  (wizardStep === "upload" || wizardStep === "complete")
                )
                  resetWizard();
                if (open) setIsWizardOpen(true);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant='outline'
                  className='shadow-sm transition-all text-xs sm:text-sm px-3 sm:px-4 text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                >
                  <FileSpreadsheet className='w-4 h-4 mr-1 sm:mr-1.5' />
                  <span className='hidden sm:inline'>Bulk Import</span>
                </Button>
              </DialogTrigger>
              <DialogContent className='w-[95vw] sm:max-w-3xl p-0 overflow-hidden rounded-xl'>
                {/* STEP 1: UPLOAD */}
                {wizardStep === "upload" && (
                  <div className='p-6'>
                    <DialogHeader className='mb-4'>
                      <DialogTitle className='text-lg sm:text-xl text-emerald-700 flex items-center'>
                        <UploadCloud className='w-5 h-5 mr-2' />
                        Bulk Import via Excel
                      </DialogTitle>
                      <DialogDescription>
                        Download the template, add your user records, and upload
                        it to import in bulk.
                      </DialogDescription>
                    </DialogHeader>

                    <div className='flex flex-col gap-4 mt-2'>
                      <Button
                        variant='outline'
                        onClick={handleDownloadTemplate}
                        className='w-full border-dashed border-slate-300 hover:bg-slate-50'
                      >
                        <Download className='w-4 h-4 mr-2 text-slate-600' />
                        Download Example Template
                      </Button>

                      <div className='relative'>
                        <Input
                          type='file'
                          accept='.xlsx, .xls, .csv'
                          onChange={handleFileUpload}
                          className='opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10'
                        />
                        <div className='w-full p-8 border-2 border-dashed rounded-lg text-center flex flex-col items-center justify-center gap-3 transition-colors bg-emerald-50 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'>
                          <div className='w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm'>
                            <FileSpreadsheet className='w-6 h-6 text-emerald-600' />
                          </div>
                          <div>
                            <p className='text-sm font-semibold text-emerald-800'>
                              Click or drag to upload
                            </p>
                            <p className='text-xs text-emerald-600 mt-1'>
                              .xlsx, .xls, or .csv up to 10MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: PREVIEW & VALIDATE */}
                {wizardStep === "preview" && (
                  <div className='flex flex-col h-full max-h-[85vh]'>
                    <div className='p-6 pb-4 border-b'>
                      <DialogHeader>
                        <DialogTitle className='text-lg sm:text-xl text-slate-900'>
                          Review Data
                        </DialogTitle>
                        <DialogDescription>
                          Review the parsed data below. Ensure all required
                          fields (Name, Email) are present before confirming.
                        </DialogDescription>
                      </DialogHeader>
                      <div className='flex gap-4 mt-4 text-sm'>
                        <span className='flex items-center text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium border border-emerald-200'>
                          <CheckCircle2 className='w-4 h-4 mr-1.5' />
                          {validRowsCount} Valid Rows
                        </span>
                        {invalidRowsCount > 0 && (
                          <span className='flex items-center text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md font-medium border border-rose-200'>
                            <AlertCircle className='w-4 h-4 mr-1.5' />
                            {invalidRowsCount} Invalid Rows
                          </span>
                        )}
                      </div>
                    </div>

                    <ScrollArea className='flex-1 p-0 bg-slate-50 max-h-[400px]'>
                      <Table>
                        <TableHeader className='sticky top-0 bg-white shadow-sm z-10'>
                          <TableRow>
                            <TableHead className='w-[50px] text-center'>
                              #
                            </TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Role</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkImportData.map((row, idx) => (
                            <TableRow
                              key={idx}
                              className={!row.isValid ? "bg-rose-50/50" : ""}
                            >
                              <TableCell className='text-center text-slate-400 font-mono text-xs'>
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                {row.isValid ? (
                                  <span className='flex w-fit items-center text-[10px] font-bold uppercase tracking-wider text-emerald-700'>
                                    Valid
                                  </span>
                                ) : (
                                  <span className='flex w-fit items-center text-[10px] font-bold uppercase tracking-wider text-rose-700 gap-1'>
                                    <AlertCircle className='w-3 h-3' /> Missing
                                    Data
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className='font-medium text-xs sm:text-sm'>
                                {row.name || (
                                  <span className='text-rose-400 italic'>
                                    Empty
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className='text-xs sm:text-sm'>
                                {row.email || (
                                  <span className='text-rose-400 italic'>
                                    Empty
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className='text-xs sm:text-sm'>
                                {row.phoneNumber || (
                                  <span className='text-slate-400 italic'>
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{getRoleBadge(row.role)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    <div className='p-4 border-t bg-white flex justify-end gap-2'>
                      <Button
                        variant='outline'
                        onClick={() => setWizardStep("upload")}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleStartImport}
                        disabled={validRowsCount === 0}
                        className='bg-emerald-600 hover:bg-emerald-700 text-white'
                      >
                        Confirm & Import {validRowsCount} Users{" "}
                        <ArrowRight className='w-4 h-4 ml-1.5' />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3 & 4: IMPORTING & SUMMARY */}
                {(wizardStep === "importing" || wizardStep === "complete") && (
                  <div className='p-6'>
                    <DialogHeader className='mb-4'>
                      <DialogTitle className='text-lg sm:text-xl text-slate-900 flex items-center gap-2'>
                        {wizardStep === "complete" ? (
                          <>
                            <CheckCircle2 className='w-5 h-5 text-emerald-600' />{" "}
                            Import Complete
                          </>
                        ) : (
                          <>
                            <Loader2 className='w-5 h-5 text-indigo-600 animate-spin' />{" "}
                            Importing Data...
                          </>
                        )}
                      </DialogTitle>
                    </DialogHeader>

                    <div className='space-y-4'>
                      <div className='flex justify-between items-center text-sm font-medium'>
                        <span className='text-slate-600'>
                          {wizardStep === "complete"
                            ? "Processing finished."
                            : "Saving users to database..."}
                        </span>
                        <span
                          className={
                            wizardStep === "complete"
                              ? "text-emerald-600"
                              : "text-indigo-600"
                          }
                        >
                          {importProgress}%
                        </span>
                      </div>
                      <div className='w-full bg-slate-100 rounded-full h-2.5 border border-slate-200 overflow-hidden'>
                        <div
                          className={`${wizardStep === "complete" ? "bg-emerald-500" : "bg-indigo-600"} h-2.5 rounded-full transition-all duration-300 ease-out`}
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>

                    <div
                      ref={importListRef}
                      className={`mt-6 space-y-2 overflow-y-auto pr-2 custom-scrollbar transition-all ${wizardStep === "complete" ? "max-h-[220px]" : "max-h-[160px]"}`}
                    >
                      {importStatuses
                        .filter((u) => u.isValid)
                        .map((user, idx) => (
                          <div
                            key={idx}
                            data-status={user.status}
                            className={`flex items-center justify-between p-2.5 rounded-md border text-sm transition-colors ${user.status === "loading" ? "bg-indigo-50 border-indigo-100" : user.status === "success" ? "bg-emerald-50/50 border-emerald-100" : user.status === "failed" ? "bg-rose-50/50 border-rose-100" : "bg-white border-slate-200"}`}
                          >
                            <div className='flex flex-col overflow-hidden pr-2'>
                              <span className='font-semibold text-slate-700 truncate'>
                                {user.name}
                              </span>
                              <span className='text-[11px] text-slate-500 truncate'>
                                {user.email}
                              </span>
                            </div>
                            <div className='shrink-0 flex items-center justify-center w-6 h-6'>
                              {user.status === "pending" && (
                                <CircleDashed className='w-4 h-4 text-slate-300' />
                              )}
                              {user.status === "loading" && (
                                <Spinner
                                  size='sm'
                                  className='w-4 h-4 text-indigo-500'
                                />
                              )}
                              {user.status === "success" && (
                                <CheckCircle2 className='w-4 h-4 text-emerald-500' />
                              )}
                              {user.status === "failed" && (
                                <XCircle className='w-4 h-4 text-rose-500' />
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className='mt-6 flex justify-end'>
                      {wizardStep === "complete" && (
                        <Button
                          onClick={resetWizard}
                          className='bg-slate-900 hover:bg-slate-800 text-white w-full sm:w-auto min-w-[120px]'
                        >
                          Close & Finish
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* --- CREATE USER DIALOG --- */}
            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) setFormData(initialFormState);
              }}
            >
              <DialogTrigger asChild>
                <Button className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all text-xs sm:text-sm px-3 sm:px-4'>
                  <Plus className='w-4 h-4 mr-1 sm:mr-1.5' /> Add User
                </Button>
              </DialogTrigger>

              <DialogContent className='w-[92vw] max-w-[550px] max-h-[90vh] overflow-y-auto p-0 rounded-xl'>
                <DialogHeader className='p-6 pb-0'>
                  <DialogTitle className='text-lg sm:text-xl text-slate-900'>
                    Add New User
                  </DialogTitle>
                  <p className='text-xs sm:text-sm text-slate-500 mt-1'>
                    Enter credentials and system role for the new account.
                  </p>
                </DialogHeader>

                <form onSubmit={handleCreateUser} className='p-6 space-y-4'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                        Full Name *
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
                        Email Address *
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
                  </div>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                        Phone Number
                      </label>
                      <Input
                        type='tel'
                        placeholder='0912-xxx-xxxx'
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phoneNumber: formatPhoneNumber(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                        Sex
                      </label>
                      <Select
                        value={formData.sex}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sex: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select gender' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Male'>Male</SelectItem>
                          <SelectItem value='Female'>Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      System Role *
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

                  {formData.role === "STUDENT" && (
                    <div className='space-y-1.5 border-t pt-4 mt-2'>
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
                            <SelectItem value='11'>Grade 11</SelectItem>
                            <SelectItem value='12'>Grade 12</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={formData.section}
                          onValueChange={(value) =>
                            setFormData({ ...formData, section: value })
                          }
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Section' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='STEM A'>STEM A</SelectItem>
                            <SelectItem value='STEM B'>STEM B</SelectItem>
                            <SelectItem value='STEM MATH'>STEM MATH</SelectItem>
                            <SelectItem value='STEM SCIENCE'>
                              STEM SCIENCE
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className='space-y-1.5 pt-2'>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                      Temporary Password *
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

                  <div className='flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-6 border-t mt-6'>
                    <Button
                      type='button'
                      variant='outline'
                      disabled={isCreatingUser}
                      onClick={() => setIsModalOpen(false)}
                      className='order-2 sm:order-1'
                    >
                      Cancel
                    </Button>
                    <Button
                      type='submit'
                      disabled={isCreatingUser}
                      className='order-1 sm:order-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]'
                    >
                      {isCreatingUser ? (
                        <>
                          <Spinner
                            size='sm'
                            className='w-4 h-4 mr-2 text-white'
                          />{" "}
                          Saving...
                        </>
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* SINGLE ADD SUCCESS PROMPT */}
            <Dialog
              open={!!addedUserResult}
              onOpenChange={() => setAddedUserResult(null)}
            >
              <DialogContent className='w-[92vw] max-w-[400px] p-6 rounded-lg text-center'>
                <div className='flex flex-col items-center justify-center space-y-4'>
                  <div className='w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2'>
                    <CheckCircle2 className='w-6 h-6 text-emerald-600' />
                  </div>
                  <DialogTitle className='text-xl text-slate-900'>
                    User Successfully Added!
                  </DialogTitle>
                  <div className='text-sm text-slate-600 space-y-1 bg-slate-50 w-full p-4 rounded border text-left shadow-inner'>
                    <p>
                      <strong className='text-slate-800'>Name:</strong>{" "}
                      {addedUserResult?.name}
                    </p>
                    <p>
                      <strong className='text-slate-800'>Email:</strong>{" "}
                      {addedUserResult?.email}
                    </p>
                    <p>
                      <strong className='text-slate-800'>Role:</strong>{" "}
                      {addedUserResult?.role}
                    </p>
                  </div>
                  <Button
                    onClick={() => setAddedUserResult(null)}
                    className='bg-slate-900 hover:bg-slate-800 text-white w-full mt-2'
                  >
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className='bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden'>
        <div className='overflow-x-auto w-full'>
          <Table className='w-full min-w-[800px]'>
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
                  Phone
                </TableHead>
                <TableHead className='text-xs font-bold text-slate-500 uppercase tracking-wider h-10'>
                  Sex
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
                  <TableCell colSpan={9} className='h-56 text-center'>
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
                    <TableCell className='text-slate-500 text-xs sm:text-sm'>
                      {formatPhoneNumber(user.phoneNumber) || "—"}
                    </TableCell>
                    <TableCell className='text-slate-500 text-xs sm:text-sm'>
                      {user.sex || "—"}
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
        <DialogContent className='w-[92vw] max-w-[500px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg'>
          <DialogHeader>
            <DialogTitle className='text-lg sm:text-xl text-slate-900'>
              Edit User
            </DialogTitle>
            <p className='text-xs sm:text-sm text-slate-500 mt-1'>
              Update details and permissions for this account.
            </p>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className='space-y-3.5 mt-2'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
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
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                  Phone Number
                </label>
                <Input
                  type='tel'
                  placeholder='0912-xxx-xxxx'
                  value={editFormData.phoneNumber}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      phoneNumber: formatPhoneNumber(e.target.value),
                    })
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-xs font-semibold text-slate-600 uppercase tracking-wider'>
                  Sex
                </label>
                <Select
                  value={editFormData.sex}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, sex: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select gender' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Male'>Male</SelectItem>
                    <SelectItem value='Female'>Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

            {editFormData.role === "STUDENT" && (
              <div className='space-y-1.5 border-t pt-4 mt-2'>
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
                      <SelectItem value='11'>Grade 11</SelectItem>
                      <SelectItem value='12'>Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={editFormData.section}
                    onValueChange={(value) =>
                      setEditFormData({ ...editFormData, section: value })
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Section' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='STEM A'>STEM A</SelectItem>
                      <SelectItem value='STEM B'>STEM B</SelectItem>
                      <SelectItem value='STEM MATH'>STEM MATH</SelectItem>
                      <SelectItem value='STEM SCIENCE'>STEM SCIENCE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className='flex justify-end space-x-2 pt-6 mt-4 border-t'>
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
