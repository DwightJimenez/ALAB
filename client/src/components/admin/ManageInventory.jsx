import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  X,
  UploadCloud,
  Loader2,
  Search,
  Filter,
  Eye,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  CircleDashed,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@supabase/supabase-js";
import { Spinner } from "@/components/ui/spinner";
import LogoLoader from "../LogoLoader";

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ManageInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- WIZARD: Bulk Import State ---
  const fileInputRef = useRef(null);
  const importListRef = useRef(null);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  // Steps: 'upload' -> 'preview' -> 'importing' -> 'complete'
  const [wizardStep, setWizardStep] = useState("upload"); 
  
  const [bulkImportData, setBulkImportData] = useState([]);
  const [importStatuses, setImportStatuses] = useState([]);
  const [importProgress, setImportProgress] = useState(0);

  // Full-page conditional view
  const [viewInstancesItem, setViewInstancesItem] = useState(null);

  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");

  const API_URL = import.meta.env.VITE_API_URL;

  const getInitialForm = () => ({
    name: "",
    category: "CHEMICAL",
    imageUrl: "",
    totalQuantity: 1,
    capacity: "",
    unit: "ml",
    expirationDate: "",
    instances: [{ controlNumber: "CHM-2026-001", condition: "Good" }],
  });

  const [formData, setFormData] = useState(getInitialForm());
  const [editFormData, setEditFormData] = useState(getInitialForm());

  const isIndividualCategory = (category) =>
    [
      "EQUIPMENT",
      "GLASSWARE",
      "CLEANING",
      "Plasticware",
      "Porcelain Ware",
    ].includes(category);

  // --- Fetch Data ---
  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inventory/admin`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data);
    } catch (err) {
      toast.error("Could not fetch inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Scroll to active importing item
  useEffect(() => {
    if (importListRef.current && wizardStep === "importing") {
      const activeElement = importListRef.current.querySelector(
        '[data-status="loading"]'
      );
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [importProgress, wizardStep]);

  // --- Smart Control Number Engine (Acronym, Consonants, & Family Grouping) ---
  const generatePrefix = (name, contextItems = items) => {
    if (!name) return "ITM";
    const upperName = name.trim().toUpperCase();

    const firstWord = upperName.split(/[\s\W_]+/)[0] || "";

    const words = upperName
      .split(/[\s-]+/)
      .map((w) => w.replace(/[^A-Z]/g, ""))
      .filter(Boolean);

    let attempt = "";

    if (words.length >= 3) {
      attempt = words[0][0] + words[1][0] + words[2][0];
    } else {
      const cleanName = upperName.replace(/[^A-Z]/g, "");
      const consonants = cleanName.replace(/[AEIOU]/g, "");
      attempt = (consonants.length >= 3 ? consonants : cleanName)
        .padEnd(3, "X")
        .substring(0, 3);
    }

    const prefixMap = new Map();
    contextItems.forEach((item) => {
      if (
        item.instances &&
        item.instances.length > 0 &&
        item.instances[0].controlNumber
      ) {
        const match = item.instances[0].controlNumber.match(/^([A-Z]+)-/);
        if (match) {
          const itemFirstWord =
            item.name
              .trim()
              .toUpperCase()
              .split(/[\s\W_]+/)[0] || "";
          prefixMap.set(match[1], itemFirstWord);
        }
      }
    });

    const isCollision = (pfx) => {
      const ownerFirstWord = prefixMap.get(pfx);
      return ownerFirstWord && ownerFirstWord !== firstWord;
    };

    if (!isCollision(attempt)) return attempt;

    const cleanName = upperName.replace(/[^A-Z]/g, "");
    if (cleanName.length >= 3) {
      for (let i = 1; i < cleanName.length - 1; i++) {
        for (let j = i + 1; j < cleanName.length; j++) {
          let altAttempt = cleanName[0] + cleanName[i] + cleanName[j];
          if (!isCollision(altAttempt)) return altAttempt;
        }
      }
    }

    let base = attempt.substring(0, 2);
    for (let charCode = 65; charCode <= 90; charCode++) {
      let fallbackAttempt = base + String.fromCharCode(charCode);
      if (!isCollision(fallbackAttempt)) return fallbackAttempt;
    }

    return attempt;
  };

  const adjustInstances = (name, instances, targetQuantity) => {
    const count = Math.max(1, parseInt(targetQuantity) || 1);
    const currentCount = instances.length;
    let newInstances = [...instances];

    const prefixStr = generatePrefix(name);
    const year = new Date().getFullYear();
    const prefixFull = `${prefixStr}-${year}-`;

    const getGlobalMax = () => {
      let maxSerial = 0;
      items.forEach((item) => {
        if (selectedItem && item.id === selectedItem.id) return;
        item.instances?.forEach((inst) => {
          if (inst.controlNumber?.startsWith(prefixFull)) {
            const match = inst.controlNumber.match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxSerial) maxSerial = num;
            }
          }
        });
      });
      return maxSerial;
    };

    if (count > currentCount) {
      let localMax = 0;
      newInstances.forEach((inst) => {
        if (inst.controlNumber?.startsWith(prefixFull)) {
          const match = inst.controlNumber.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > localMax) localMax = num;
          }
        }
      });

      if (localMax === 0) localMax = getGlobalMax();

      let serial = localMax;
      for (let i = currentCount; i < count; i++) {
        serial++;
        newInstances.push({
          controlNumber: `${prefixFull}${String(serial).padStart(3, "0")}`,
          condition: "Good",
        });
      }
    } else if (count < currentCount) {
      newInstances = newInstances.slice(0, count);
    }

    if (newInstances.length > 0) {
      let currentGlobalMax = null;
      for (let i = 0; i < newInstances.length; i++) {
        if (
          !newInstances[i].controlNumber ||
          newInstances[i].controlNumber.startsWith("ITM-") ||
          newInstances[i].controlNumber.startsWith("CHM-")
        ) {
          if (currentGlobalMax === null) {
            currentGlobalMax = getGlobalMax();
            newInstances.forEach((inst) => {
              if (inst.controlNumber?.startsWith(prefixFull)) {
                const match = inst.controlNumber.match(/-(\d+)$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > currentGlobalMax) currentGlobalMax = num;
                }
              }
            });
          }
          currentGlobalMax++;
          newInstances[i].controlNumber =
            `${prefixFull}${String(currentGlobalMax).padStart(3, "0")}`;
        }
      }
    }

    return newInstances;
  };

  const handleInstanceEdit = (index, field, value, isEditMode = false) => {
    const currentData = isEditMode ? editFormData : formData;
    const setter = isEditMode ? setEditFormData : setFormData;
    const newInstances = [...currentData.instances];

    const isAutoGenCategory =
      isIndividualCategory(currentData.category) ||
      currentData.category === "CHEMICAL";

    if (field === "controlNumber") {
      value = value.toUpperCase().replace(/\s+/g, "");
    }

    newInstances[index][field] = value;

    if (field === "controlNumber" && isAutoGenCategory) {
      const match = value.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        let serial = parseInt(match[2], 10);
        const padLength = match[2].length;

        for (let i = index + 1; i < newInstances.length; i++) {
          serial++;
          newInstances[i].controlNumber =
            `${prefix}${String(serial).padStart(padLength, "0")}`;
        }
      }
    }

    setter({ ...currentData, instances: newInstances });
  };

  const handleSizeChange = (currentData, setter, field, value) => {
    let updated = { ...currentData, [field]: value };

    if (field === "category") {
      if (isIndividualCategory(value)) {
        updated.unit = "pc/s";
        updated.expirationDate = "";
        updated.capacity = "";
      }

      updated.instances = adjustInstances(
        updated.name,
        updated.instances,
        updated.totalQuantity,
      );
    }

    if (field === "name") {
      if (
        isIndividualCategory(updated.category) ||
        updated.category === "CHEMICAL"
      ) {
        const oldBase = generatePrefix(currentData.name);
        const newBase = generatePrefix(value);
        const year = new Date().getFullYear();

        if (oldBase !== newBase) {
          let globalMax = 0;
          items.forEach((item) => {
            if (selectedItem && item.id === selectedItem.id) return;
            item.instances?.forEach((inst) => {
              if (inst.controlNumber?.startsWith(`${newBase}-${year}-`)) {
                const match = inst.controlNumber.match(/-(\d+)$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > globalMax) globalMax = num;
                }
              }
            });
          });

          updated.instances = updated.instances.map((inst) => {
            const oldPrefixFull = `${oldBase}-${year}-`;
            if (
              !inst.controlNumber ||
              inst.controlNumber.startsWith(oldPrefixFull) ||
              inst.controlNumber.startsWith(`CHM-${year}-`) ||
              inst.controlNumber.startsWith(`ITM-${year}-`)
            ) {
              globalMax++;
              return {
                ...inst,
                controlNumber: `${newBase}-${year}-${String(globalMax).padStart(3, "0")}`,
              };
            }
            return inst;
          });
        }

        updated.instances = adjustInstances(
          value,
          updated.instances,
          updated.totalQuantity,
        );
      }
    }

    if (field === "totalQuantity") {
      updated.totalQuantity = value;
      if (
        isIndividualCategory(updated.category) ||
        updated.category === "CHEMICAL"
      ) {
        updated.instances = adjustInstances(
          updated.name,
          updated.instances,
          value,
        );
      }
    }

    setter(updated);
  };

  const addInstance = (currentData, setter) => {
    const newInstances = [
      ...currentData.instances,
      { controlNumber: "", condition: "Good" },
    ];
    setter({
      ...currentData,
      instances: newInstances,
      totalQuantity: newInstances.length,
    });
  };

  const removeInstance = (index, currentData, setter) => {
    if (currentData.instances.length <= 1) {
      toast.error("You must have at least one item.");
      return;
    }
    const newInstances = currentData.instances.filter((_, i) => i !== index);
    setter({
      ...currentData,
      instances: newInstances,
      totalQuantity: newInstances.length,
    });
  };

  const handleInstanceChange = (index, field, value) => {
    const newInstances = [...formData.instances];
    if (field === "controlNumber")
      value = value.toUpperCase().replace(/\s+/g, "");
    newInstances[index][field] = value;
    setFormData({ ...formData, instances: newInstances });
  };

  const handleEditInstanceChange = (index, field, value) => {
    const newInstances = [...editFormData.instances];
    if (field === "controlNumber")
      value = value.toUpperCase().replace(/\s+/g, "");
    newInstances[index][field] = value;
    setEditFormData({ ...editFormData, instances: newInstances });
  };

  const handleImageUpload = async (e, currentData, setter) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.error("Please upload a valid image file.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be smaller than 5MB.");
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `inventory/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("inventory-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("inventory-images")
        .getPublicUrl(filePath);

      handleSizeChange(currentData, setter, "imageUrl", data.publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- WIZARD: Bulk Import Flow ---
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Name: "Beaker 250ml",
        Category: "GLASSWARE",
        Quantity: 10,
        Unit: "pc/s",
        "Size per Bottle": "",
        "Expiration Date": "",
      },
      {
        Name: "Hydrochloric Acid",
        Category: "CHEMICAL",
        Quantity: 5,
        Unit: "L",
        "Size per Bottle": 1.5,
        "Expiration Date": "2026-12-31",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Inventory_Import_Template.xlsx");
    toast.success("Template downloaded successfully!");
  };

  const resetWizard = () => {
    setIsWizardOpen(false);
    setTimeout(() => {
      setWizardStep("upload");
      setBulkImportData([]);
      setImportStatuses([]);
      setImportProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 300); // Wait for modal exit animation
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          toast.error("The uploaded Excel file is empty.");
          return;
        }

        let temporaryItems = [...items];
        const payloads = [];

        for (let index = 0; index < data.length; index++) {
          const row = data[index];
          const name = row.Name || "";
          const category = row.Category || "EQUIPMENT";
          const totalQty = Math.max(1, parseInt(row.Quantity) || 1);
          const unit = row.Unit || "pc/s";
          const capacity = row["Size per Bottle"]
            ? parseFloat(row["Size per Bottle"])
            : 1;
          const expirationDate = row["Expiration Date"] || null;

          // Validation
          let isValid = name.trim() !== "";
          if (category === "CHEMICAL" && (!capacity || capacity <= 0)) {
            isValid = false;
          }

          const prefixStr = generatePrefix(name, temporaryItems);
          const year = new Date().getFullYear();
          const prefixFull = `${prefixStr}-${year}-`;

          let localMax = 0;
          temporaryItems.forEach((item) => {
            item.instances?.forEach((inst) => {
              if (inst.controlNumber?.startsWith(prefixFull)) {
                const match = inst.controlNumber.match(/-(\d+)$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > localMax) localMax = num;
                }
              }
            });
          });

          const newInstances = [];
          for (let i = 0; i < totalQty; i++) {
            localMax++;
            newInstances.push({
              controlNumber: isValid ? `${prefixFull}${String(localMax).padStart(3, "0")}` : "N/A",
              condition: "Good",
              expirationDate: category === "CHEMICAL" ? expirationDate : null,
              quantity: category === "CHEMICAL" ? capacity : 1,
              capacity: category === "CHEMICAL" ? capacity : 1,
            });
          }

          const itemPayload = {
            id: index,
            name,
            category,
            totalQuantity: totalQty,
            unit,
            capacity: category === "CHEMICAL" ? capacity : "",
            expirationDate: category === "CHEMICAL" ? expirationDate : "",
            imageUrl: "",
            instances: newInstances,
            isValid: isValid,
            selected: isValid,
            status: "pending",
          };

          temporaryItems.push(itemPayload);
          payloads.push(itemPayload);
        }

        setBulkImportData(payloads);
        setImportStatuses(payloads);
        setWizardStep("preview");
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse Excel data.");
      } finally {
        if (e.target) e.target.value = null; // reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleBulkItemSelection = (index) => {
    const updatedData = [...bulkImportData];
    updatedData[index].selected = !updatedData[index].selected;
    setBulkImportData(updatedData);
  };

  const handleStartImport = async () => {
    const validItemsToImport = bulkImportData.filter(i => i.selected && i.isValid);
    if (validItemsToImport.length === 0) {
      toast.error("No valid items selected for import.");
      return;
    }

    setWizardStep("importing");
    setImportProgress(0);

    for (let i = 0; i < bulkImportData.length; i++) {
      if (!bulkImportData[i].isValid || !bulkImportData[i].selected) continue;

      setImportStatuses((prev) =>
        prev.map((u, idx) => (idx === i ? { ...u, status: "loading" } : u))
      );

      let isSuccess = false;
      try {
        const payload = { ...bulkImportData[i] };
        delete payload.isValid;
        delete payload.selected;
        delete payload.id;
        delete payload.status;

        const response = await fetch(`${API_URL}/api/inventory/batch`, {
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
          idx === i ? { ...u, status: isSuccess ? "success" : "failed" } : u
        )
      );

      setImportProgress(Math.round(((i + 1) / bulkImportData.length) * 100));
    }

    setWizardStep("complete");
    fetchInventory();
  };

  // --- CREATE Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading)
      return toast.error("Please wait for the image to finish uploading.");

    if (formData.instances.some((inst) => !inst.controlNumber.trim())) {
      toast.error("Please fill in all Control Numbers.");
      return;
    }
    if (
      formData.category === "CHEMICAL" &&
      (!formData.capacity || parseFloat(formData.capacity) <= 0)
    ) {
      toast.error("Please specify a valid Size per Bottle.");
      return;
    }

    const payload = {
      ...formData,
      instances: formData.instances.map((inst) => ({
        ...inst,
        expirationDate:
          formData.category === "CHEMICAL" ? formData.expirationDate : null,
        quantity:
          formData.category === "CHEMICAL" ? parseFloat(formData.capacity) : 1,
        capacity:
          formData.category === "CHEMICAL" ? parseFloat(formData.capacity) : 1,
      })),
    };

    try {
      const response = await fetch(`${API_URL}/api/inventory/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok)
        return toast.error(data.error || "Failed to add inventory.");

      toast.success("Inventory items added successfully!");
      setIsModalOpen(false);
      setFormData(getInitialForm());
      fetchInventory();
    } catch (err) {
      toast.error("Failed to connect to the server.");
    }
  };

  // --- EDIT Logic ---
  const openEditModal = (item) => {
    setSelectedItem(item);
    setEditFormData({
      name: item.name || "",
      category: item.category || "CHEMICAL",
      imageUrl: item.imageUrl || "",
      totalQuantity: item.instances ? item.instances.length : 1,
      capacity:
        item.instances && item.instances[0] ? item.instances[0].capacity : "",
      unit: item.unit || "ml",
      expirationDate:
        item.instances && item.instances[0]?.expirationDate
          ? item.instances[0].expirationDate.split("T")[0]
          : "",
      instances:
        item.instances && item.instances.length > 0
          ? item.instances
          : [{ controlNumber: "", condition: "Good" }],
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUploading)
      return toast.error("Please wait for the image to finish uploading.");

    if (editFormData.instances.some((inst) => !inst.controlNumber.trim())) {
      toast.error("Please fill in all Control Numbers.");
      return;
    }
    if (
      editFormData.category === "CHEMICAL" &&
      (!editFormData.capacity || parseFloat(editFormData.capacity) <= 0)
    ) {
      toast.error("Please specify a valid Size per Bottle.");
      return;
    }

    const payload = {
      ...editFormData,
      instances: editFormData.instances.map((inst) => ({
        ...inst,
        expirationDate:
          editFormData.category === "CHEMICAL"
            ? editFormData.expirationDate
            : null,
        quantity:
          editFormData.category === "CHEMICAL"
            ? parseFloat(editFormData.capacity)
            : 1,
        capacity:
          editFormData.category === "CHEMICAL"
            ? parseFloat(editFormData.capacity)
            : 1,
      })),
    };

    try {
      const response = await fetch(
        `${API_URL}/api/inventory/${selectedItem.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return toast.error(data.error || "Failed to update inventory.");
      }

      toast.success("Inventory updated successfully!");
      setIsEditModalOpen(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (err) {
      toast.error("Failed to connect to the server.");
    }
  };

  // --- DELETE Logic ---
  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(
        `${API_URL}/api/inventory/${selectedItem.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return toast.error(data.error || "Failed to delete item.");
      }

      toast.success("Item deleted successfully!");
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (err) {
      toast.error("Failed to connect to the server.");
    }
  };

  // --- FILTERING LOGIC ---
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.instances?.some((i) =>
        i.controlNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesCategory =
      filterCategory === "ALL" || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const isIndividualItems = isIndividualCategory(formData.category);
  const isEditIndividualItems = isIndividualCategory(editFormData.category);

  const isAutoGenerated = isIndividualItems || formData.category === "CHEMICAL";
  const isEditAutoGenerated =
    isEditIndividualItems || editFormData.category === "CHEMICAL";

  const validRowsCount = bulkImportData.filter(i => i.isValid).length;
  const invalidRowsCount = bulkImportData.length - validRowsCount;

  // ==========================================
  // --- RENDER: DETAILED ITEM INSTANCES VIEW ---
  // ==========================================
  if (viewInstancesItem) {
    return (
      <div className='bg-white min-h-screen p-4 sm:p-6 lg:p-8 rounded-lg w-full print:p-0 print:m-0'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4 print:hidden border-b pb-4'>
          <div>
            <div className='flex items-center gap-3 mb-1'>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setViewInstancesItem(null)}
                className='h-8 w-8 text-slate-500 hover:text-slate-900'
              >
                <ArrowLeft className='w-5 h-5' />
              </Button>
              <h2 className='text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3'>
                {viewInstancesItem.name}
              </h2>
            </div>
            <p className='text-xs sm:text-sm text-slate-500 ml-11'>
              Viewing {viewInstancesItem.instances?.length || 0} registered
              control numbers and exact logic stocks.
            </p>
          </div>
        </div>

        {/* The Grid of Instances */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-4 print:gap-4 print:bg-white'>
          {viewInstancesItem.instances?.map((inst, idx) => (
            <div
              key={idx}
              className='bg-slate-50 border rounded-lg p-4 flex flex-col relative shadow-sm hover:border-blue-200 transition-colors print:shadow-none print:border-slate-300 break-inside-avoid print:bg-white'
            >
              <div className='flex justify-between items-start mb-3 print:hidden'>
                <span className='font-mono text-xs font-bold text-slate-400'>
                  #{idx + 1}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded border font-semibold whitespace-nowrap
                  ${
                    inst.condition === "Good"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : inst.condition === "Fair"
                        ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                        : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {inst.condition}
                </span>
              </div>

              {/* ID Center */}
              <div className='flex flex-col items-center justify-center bg-white rounded border border-slate-200 p-4 mb-3 print:border-none print:p-0'>
                <span className='text-[10px] sm:text-xs font-bold text-slate-800 mb-2 truncate w-full text-center hidden print:block'>
                  {viewInstancesItem.name}
                </span>
                {inst.controlNumber ? (
                  <span className='font-mono font-bold text-lg text-slate-800 tracking-wider'>
                    {inst.controlNumber}
                  </span>
                ) : (
                  <span className='text-xs text-slate-400 italic py-2 print:hidden'>
                    No control number
                  </span>
                )}
              </div>

              {/* Specific Logic for Chemical Capacities */}
              {viewInstancesItem.category === "CHEMICAL" && inst.capacity && (
                <div className='mt-auto flex justify-between items-center bg-white border border-slate-200 rounded px-3 py-2 print:hidden'>
                  <span className='text-[10px] uppercase font-bold text-slate-500'>
                    Available
                  </span>
                  <span className='text-xs font-bold text-slate-800'>
                    {inst.quantity} / {inst.capacity}{" "}
                    <span className='text-slate-500 font-normal'>
                      {viewInstancesItem.unit}
                    </span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // --- RENDER: MAIN INVENTORY DASHBOARD ---
  // ==========================================
  return (
    <div className='bg-white p-4 sm:p-6 rounded-lg w-full min-w-0'>
      {/* --- HEADER & CONTROLS --- */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'>
        <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-slate-900'>
          Laboratory Inventory
        </h2>

        <div className='flex flex-wrap items-center gap-2 sm:gap-3 print:hidden w-full sm:w-auto'>
          
          {/* --- UNIFIED BULK IMPORT WIZARD --- */}
          <Dialog 
            open={isWizardOpen} 
            onOpenChange={(open) => {
              if(!open && (wizardStep === 'upload' || wizardStep === 'complete')) resetWizard();
              if(open) setIsWizardOpen(true);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant='outline'
                className='flex-1 sm:flex-none text-green-700 border-green-200 hover:bg-green-50 shadow-sm transition-all text-xs sm:text-sm px-3 sm:px-4'
              >
                <FileSpreadsheet className='w-4 h-4 mr-1 sm:mr-1.5' />
                <span className='hidden sm:inline'>Bulk Import</span>
              </Button>
            </DialogTrigger>
            <DialogContent className='w-[95vw] sm:max-w-4xl p-0 overflow-hidden rounded-xl h-auto max-h-[90vh] flex flex-col'>
              
              {/* STEP 1: UPLOAD */}
              {wizardStep === "upload" && (
                <div className="p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle className='text-lg sm:text-xl text-green-700 flex items-center'>
                      <UploadCloud className="w-5 h-5 mr-2"/>
                      Bulk Import via Excel
                    </DialogTitle>
                    <DialogDescription>
                      Download the template below, populate your inventory items, and upload it to import in bulk.
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
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className='opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10'
                      />
                      <div className='w-full p-8 border-2 border-dashed rounded-lg text-center flex flex-col items-center justify-center gap-3 transition-colors bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-400'>
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <FileSpreadsheet className='w-6 h-6 text-green-600' />
                        </div>
                        <div>
                          <p className='text-sm font-semibold text-green-800'>Click or drag to upload</p>
                          <p className="text-xs text-green-600 mt-1">.xlsx, .xls, or .csv up to 10MB</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PREVIEW & VALIDATE */}
              {wizardStep === "preview" && (
                <div className="flex flex-col flex-1 h-full min-h-[500px]">
                  <div className="p-6 pb-4 border-b">
                    <DialogHeader>
                      <DialogTitle className='text-lg sm:text-xl text-slate-900'>
                        Review Inventory Data
                      </DialogTitle>
                      <DialogDescription>
                        Review the items extracted from your file. Verify categories, quantities, and auto-generated control numbers before importing.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-4 mt-4 text-sm">
                      <span className="flex items-center text-green-700 bg-green-50 px-2.5 py-1 rounded-md font-medium border border-green-200">
                        <CheckCircle2 className="w-4 h-4 mr-1.5"/>
                        {validRowsCount} Valid Items
                      </span>
                      {invalidRowsCount > 0 && (
                        <span className="flex items-center text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md font-medium border border-rose-200">
                          <AlertCircle className="w-4 h-4 mr-1.5"/>
                          {invalidRowsCount} Invalid Items
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <ScrollArea className="flex-1 p-0 bg-slate-50 h-[300px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                        <TableRow>
                          <TableHead className="w-[50px] text-center">Select</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className='text-center'>Qty</TableHead>
                          <TableHead>Control Number Range</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkImportData.map((row, idx) => (
                          <TableRow key={idx} className={(!row.isValid || !row.selected) ? "bg-slate-50/50 opacity-70" : ""}>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={!row.isValid}
                                onChange={() => toggleBulkItemSelection(idx)}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-600 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </TableCell>
                            <TableCell>
                              {row.isValid ? (
                                <span className="flex w-fit items-center text-[10px] font-bold uppercase tracking-wider text-green-700">Valid</span>
                              ) : (
                                <span className="flex w-fit items-center text-[10px] font-bold uppercase tracking-wider text-rose-700 gap-1">
                                  <AlertCircle className="w-3 h-3"/> Missing Data
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm">{row.name || <span className="text-rose-400 italic">Empty</span>}</TableCell>
                            <TableCell>
                              <span className='px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-slate-100 text-slate-700'>
                                {row.category}
                              </span>
                            </TableCell>
                            <TableCell className='text-center'>{row.totalQuantity} {row.unit}</TableCell>
                            <TableCell className='font-mono text-xs text-slate-600'>
                              {row.instances?.length > 1 ? (
                                <>
                                  {row.instances[0]?.controlNumber} <span className='text-slate-400'>→</span> {row.instances[row.instances.length - 1]?.controlNumber}
                                </>
                              ) : (
                                row.instances?.[0]?.controlNumber || "N/A"
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  <div className="p-4 border-t bg-white flex justify-between items-center gap-2">
                    <span className='text-sm text-slate-500 font-medium'>
                      {bulkImportData.filter(i => i.selected).length} of {bulkImportData.length} items selected
                    </span>
                    <div className='flex gap-2'>
                      <Button variant="outline" onClick={() => setWizardStep("upload")}>
                        Back
                      </Button>
                      <Button 
                        onClick={handleStartImport} 
                        disabled={validRowsCount === 0 || bulkImportData.filter(i => i.selected).length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Confirm & Import <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 & 4: IMPORTING & SUMMARY */}
              {(wizardStep === "importing" || wizardStep === "complete") && (
                 <div className="p-6">
                  <DialogHeader className="mb-4">
                    <DialogTitle className='text-lg sm:text-xl text-slate-900 flex items-center gap-2'>
                      {wizardStep === "complete" ? (
                        <><CheckCircle2 className='w-5 h-5 text-green-600' /> Import Complete</>
                      ) : (
                        <><Loader2 className="w-5 h-5 text-blue-600 animate-spin"/> Importing Data...</>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                 
                  <div className='space-y-4'>
                    <div className='flex justify-between items-center text-sm font-medium'>
                      <span className='text-slate-600'>
                        {wizardStep === "complete" ? "Processing finished." : "Saving inventory to database..."}
                      </span>
                      <span className={wizardStep === 'complete' ? 'text-green-600' : 'text-blue-600'}>
                        {importProgress}%
                      </span>
                    </div>
                    <div className='w-full bg-slate-100 rounded-full h-2.5 border border-slate-200 overflow-hidden'>
                      <div
                        className={`${wizardStep === 'complete' ? 'bg-green-500' : 'bg-blue-600'} h-2.5 rounded-full transition-all duration-300 ease-out`}
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                
                  <div
                    ref={importListRef}
                    className={`mt-6 space-y-2 overflow-y-auto pr-2 custom-scrollbar transition-all ${wizardStep === "complete" ? "max-h-[220px]" : "max-h-[160px]"}`}
                  >
                    {importStatuses.filter(u => u.isValid && u.selected).map((item, idx) => (
                      <div
                        key={idx}
                        data-status={item.status}
                        className={`flex items-center justify-between p-2.5 rounded-md border text-sm transition-colors ${item.status === "loading" ? "bg-blue-50 border-blue-100" : item.status === "success" ? "bg-green-50/50 border-green-100" : item.status === "failed" ? "bg-rose-50/50 border-rose-100" : "bg-white border-slate-200"}`}
                      >
                        <div className='flex flex-col overflow-hidden pr-2'>
                          <span className='font-semibold text-slate-700 truncate'>
                            {item.name}
                          </span>
                          <span className='text-[11px] text-slate-500 truncate'>
                            {item.totalQuantity} {item.unit} | {item.category}
                          </span>
                        </div>
                        <div className='shrink-0 flex items-center justify-center w-6 h-6'>
                          {item.status === "pending" && (
                            <CircleDashed className='w-4 h-4 text-slate-300' />
                          )}
                          {item.status === "loading" && (
                            <Spinner size='sm' className='w-4 h-4 text-blue-500' />
                          )}
                          {item.status === "success" && (
                            <CheckCircle2 className='w-4 h-4 text-green-500' />
                          )}
                          {item.status === "failed" && (
                            <XCircle className='w-4 h-4 text-rose-500' />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
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

          {/* --- CREATE MODAL --- */}
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) setFormData(getInitialForm());
            }}
          >
            <DialogTrigger asChild>
              <Button className='flex-1 sm:flex-none bg-pink-600 hover:bg-pink-700 text-white shadow-sm transition-all text-xs sm:text-sm px-3 sm:px-4'>
                <Plus className='w-4 h-4 mr-1 sm:mr-1.5' /> 
                <span className='hidden sm:inline'>Add Inventory</span>
                <span className='sm:hidden'>Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className='w-[95vw] p-4 sm:p-6 sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar'>
              <DialogHeader>
                <DialogTitle className='text-lg sm:text-xl text-pink-600'>
                  Add Inventory Items
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className='mt-2 sm:mt-4 space-y-4'>
                <div className='grid grid-cols-12 gap-3 sm:gap-4'>
                  <div className='col-span-12'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Item Image
                    </label>
                    <div className='mt-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
                      {formData.imageUrl ? (
                        <div className='relative h-16 w-16 rounded-md border overflow-hidden shrink-0'>
                          <img
                            src={formData.imageUrl}
                            alt='Preview'
                            className='h-full w-full object-cover'
                          />
                          <button
                            type='button'
                            onClick={() =>
                              handleSizeChange(
                                formData,
                                setFormData,
                                "imageUrl",
                                "",
                              )
                            }
                            className='absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5 hover:bg-red-600'
                          >
                            <X className='w-3 h-3' />
                          </button>
                        </div>
                      ) : (
                        <div className='h-16 w-16 rounded-md border border-dashed flex items-center justify-center bg-slate-50 text-slate-400 shrink-0'>
                          {isUploading ? (
                            <Loader2 className='w-5 h-5 animate-spin' />
                          ) : (
                            <UploadCloud className='w-5 h-5' />
                          )}
                        </div>
                      )}
                      <div className='flex-1 w-full'>
                        <Input
                          type='file'
                          accept='image/*'
                          onChange={(e) =>
                            handleImageUpload(e, formData, setFormData)
                          }
                          disabled={isUploading}
                          className='file:text-pink-600 file:bg-pink-50 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs sm:file:text-sm file:font-semibold hover:file:bg-pink-100 cursor-pointer w-full text-xs sm:text-sm'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='col-span-12 sm:col-span-7 space-y-1.5 sm:space-y-2'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Item Name *
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) =>
                        handleSizeChange(
                          formData,
                          setFormData,
                          "name",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div className='col-span-12 sm:col-span-5 space-y-1.5 sm:space-y-2'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Category *
                    </label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) =>
                        handleSizeChange(formData, setFormData, "category", val)
                      }
                    >
                      <SelectTrigger className='bg-white'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='CHEMICAL'>Chemical</SelectItem>{" "}
                        <SelectItem value='CLEANING'>Cleaning Tools</SelectItem>
                        <SelectItem value='EQUIPMENT'>Equipment</SelectItem>
                        <SelectItem value='GLASSWARE'>Glassware</SelectItem>
                        <SelectItem value='Plasticware'>Plasticware</SelectItem>
                        <SelectItem value='Porcelain Ware'>
                          Porcelain Ware
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className={`col-span-6 ${formData.category === "CHEMICAL" ? "sm:col-span-4" : "sm:col-span-6"} space-y-1.5 sm:space-y-2`}
                  >
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      {formData.category === "CHEMICAL"
                        ? "No. of Bottles *"
                        : "Quantity (Pieces) *"}
                    </label>
                    <Input
                      required
                      type='number'
                      step='1'
                      min='1'
                      value={formData.totalQuantity}
                      onChange={(e) =>
                        handleSizeChange(
                          formData,
                          setFormData,
                          "totalQuantity",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  {formData.category === "CHEMICAL" && (
                    <div className='col-span-6 sm:col-span-4 space-y-1.5 sm:space-y-2'>
                      <label className='text-xs font-bold text-slate-500 uppercase'>
                        Size per Bottle *
                      </label>
                      <Input
                        required
                        type='number'
                        step='0.01'
                        min='0.01'
                        placeholder='e.g. 1000'
                        value={formData.capacity}
                        onChange={(e) =>
                          handleSizeChange(
                            formData,
                            setFormData,
                            "capacity",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  )}

                  <div
                    className={`col-span-6 ${formData.category === "CHEMICAL" ? "sm:col-span-4" : "sm:col-span-6"} space-y-1.5 sm:space-y-2`}
                  >
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Unit *
                    </label>
                    <Select
                      value={formData.unit}
                      onValueChange={(val) =>
                        handleSizeChange(formData, setFormData, "unit", val)
                      }
                      disabled={isIndividualItems}
                    >
                      <SelectTrigger
                        className={
                          isIndividualItems
                            ? "bg-slate-100 text-slate-400"
                            : "bg-white"
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='ml'>ml</SelectItem>
                        <SelectItem value='g'>g</SelectItem>
                        <SelectItem value='kg'>kg</SelectItem>
                        <SelectItem value='L'>L</SelectItem>
                        <SelectItem value='pc/s'>pc/s</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {!isIndividualItems && (
                    <div className='col-span-12 space-y-1.5 sm:space-y-2'>
                      <label className='text-xs font-bold text-slate-500 uppercase'>
                        Expiration Date
                      </label>
                      <Input
                        type='date'
                        value={formData.expirationDate}
                        onChange={(e) =>
                          handleSizeChange(
                            formData,
                            setFormData,
                            "expirationDate",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  )}
                </div>

                <div className='pt-4 border-t mt-4'>
                  <label className='text-xs font-bold text-pink-600 uppercase mb-3 block'>
                    {isAutoGenerated
                      ? `Control Numbers & Condition (${formData.instances.length} Pieces)`
                      : "Item Tracking *"}
                  </label>

                  <ScrollArea className='h-[350px] rounded-md border p-3 sm:p-4 bg-slate-50'>
                    <div className='space-y-3'>
                      {formData.instances.map((inst, index) => (
                        <div
                          key={index}
                          className='flex items-center gap-2 w-full'
                        >
                          {isAutoGenerated && (
                            <span className='text-xs sm:text-sm font-semibold text-slate-400 w-5 sm:w-6 shrink-0'>
                              #{index + 1}
                            </span>
                          )}
                          <Input
                            required
                            placeholder='Control No.'
                            className='font-mono bg-white flex-1 uppercase min-w-[100px] text-xs sm:text-sm'
                            value={inst.controlNumber}
                            onChange={(e) =>
                              isAutoGenerated
                                ? handleInstanceEdit(
                                    index,
                                    "controlNumber",
                                    e.target.value,
                                    false,
                                  )
                                : handleInstanceChange(
                                    index,
                                    "controlNumber",
                                    e.target.value,
                                  )
                            }
                          />
                          <Select
                            value={inst.condition}
                            onValueChange={(val) =>
                              isAutoGenerated
                                ? handleInstanceEdit(
                                    index,
                                    "condition",
                                    val,
                                    false,
                                  )
                                : handleInstanceChange(index, "condition", val)
                            }
                          >
                            <SelectTrigger className='w-[85px] sm:w-[110px] bg-white shrink-0 text-xs sm:text-sm'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='Good'>Good</SelectItem>
                              <SelectItem value='Fair'>Fair</SelectItem>
                              <SelectItem value='Damaged'>Damaged</SelectItem>
                            </SelectContent>
                          </Select>

                          {!isAutoGenerated && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() =>
                                removeInstance(index, formData, setFormData)
                              }
                              className='text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10'
                            >
                              <X className='w-4 h-4' />
                            </Button>
                          )}
                        </div>
                      ))}

                      {!isAutoGenerated && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => addInstance(formData, setFormData)}
                          className='w-full mt-2 border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-300'
                        >
                          <Plus className='w-4 h-4 mr-2' /> Add Item
                        </Button>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className='flex justify-end pt-4 gap-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => setIsModalOpen(false)}
                    className='flex-1 sm:flex-none'
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={isUploading}
                    className='bg-pink-600 hover:bg-pink-700 text-white flex-1 sm:flex-none'
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className='w-4 h-4 mr-2 animate-spin' />{" "}
                        Uploading...
                      </>
                    ) : (
                      "Save Inventory"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* --- FILTERS AREA --- */}
      <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 bg-slate-50 p-3 rounded-lg border'>
        <div className='relative flex-1'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
          <Input
            placeholder='Search item name or control number...'
            className='pl-9 bg-white'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className='w-full sm:w-[200px]'>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className='bg-white'>
              <Filter className='w-4 h-4 mr-2 text-slate-400' />
              <SelectValue placeholder='All Categories' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All Categories</SelectItem>
              <SelectItem value='CHEMICAL'>Chemical</SelectItem>
              <SelectItem value='GLASSWARE'>Glassware</SelectItem>
              <SelectItem value='Plasticware'>Plasticware</SelectItem>
              <SelectItem value='Porcelain Ware'>Porcelain Ware</SelectItem>
              <SelectItem value='EQUIPMENT'>Equipment</SelectItem>
              <SelectItem value='CLEANING'>Cleaning Tools</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* --- INVENTORY TABLE --- */}
      <div className='rounded-md border overflow-x-auto'>
        <Table className='min-w-[680px]'>
          <TableHeader className='bg-slate-50'>
            <TableRow>
              <TableHead className='w-[80px]'>Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className='text-center w-[200px]'>
                Tracking Details
              </TableHead>
              <TableHead className='text-right'>Total Stock</TableHead>
              <TableHead className='text-right whitespace-nowrap'>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className='h-24 text-center'>
                  <LogoLoader size='sm' />{" "}
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-slate-500'
                >
                  No items match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id} className='items-center'>
                  <TableCell className='py-4'>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className='h-10 w-10 object-cover rounded-md border'
                      />
                    ) : (
                      <div className='h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400 border'>
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='font-medium text-slate-800 py-4'>
                    {item.name}
                  </TableCell>
                  <TableCell className='py-4'>
                    <span className='px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-slate-100 text-slate-700 whitespace-nowrap'>
                      {item.category === "CLEANING"
                        ? "CLEANING TOOLS"
                        : item.category}
                    </span>
                  </TableCell>

                  {/* --- FULL SCREEN VIEW DETAILS BUTTON --- */}
                  <TableCell className='text-center py-4'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setViewInstancesItem(item)}
                      className='text-slate-600 hover:text-slate-900 bg-slate-50/50'
                    >
                      <Eye className='w-4 h-4 mr-2 text-slate-400' />
                      View {item.instances?.length || 0} Piece(s)
                    </Button>
                  </TableCell>

                  <TableCell className='text-right font-medium py-4 whitespace-nowrap'>
                    {item.totalQuantity} {item.unit}
                  </TableCell>

                  <TableCell className='text-right py-4 whitespace-nowrap'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => openEditModal(item)}
                      className='text-blue-600 hover:bg-blue-50'
                    >
                      Edit
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => openDeleteModal(item)}
                      className='text-red-600 hover:bg-red-50 ml-1 sm:ml-2'
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- EDIT MODAL --- */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className='w-[95vw] p-4 sm:p-6 sm:max-w-[700px] max-h-[90vh] overflow-y-auto custom-scrollbar'>
          <DialogHeader>
            <DialogTitle className='text-lg sm:text-xl text-blue-600'>
              Edit Inventory Item
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className='mt-2 sm:mt-4 space-y-4'>
            <div className='grid grid-cols-12 gap-3 sm:gap-4'>
              <div className='col-span-12'>
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  Item Image
                </label>
                <div className='mt-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
                  {editFormData.imageUrl ? (
                    <div className='relative h-16 w-16 rounded-md border overflow-hidden shrink-0'>
                      <img
                        src={editFormData.imageUrl}
                        alt='Preview'
                        className='h-full w-full object-cover'
                      />
                      <button
                        type='button'
                        onClick={() =>
                          handleSizeChange(
                            editFormData,
                            setEditFormData,
                            "imageUrl",
                            "",
                          )
                        }
                        className='absolute top-0 right-0 bg-red-500 text-white rounded-bl-md p-0.5 hover:bg-red-600'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </div>
                  ) : (
                    <div className='h-16 w-16 rounded-md border border-dashed flex items-center justify-center bg-slate-50 text-slate-400 shrink-0'>
                      {isUploading ? (
                        <Loader2 className='w-5 h-5 animate-spin' />
                      ) : (
                        <UploadCloud className='w-5 h-5' />
                      )}
                    </div>
                  )}
                  <div className='flex-1 w-full'>
                    <Input
                      type='file'
                      accept='image/*'
                      onChange={(e) =>
                        handleImageUpload(e, editFormData, setEditFormData)
                      }
                      disabled={isUploading}
                      className='file:text-blue-600 file:bg-blue-50 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-xs sm:file:text-sm file:font-semibold hover:file:bg-blue-100 cursor-pointer w-full text-xs sm:text-sm'
                    />
                  </div>
                </div>
              </div>

              <div className='col-span-12 sm:col-span-7 space-y-1.5 sm:space-y-2'>
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  Item Name *
                </label>
                <Input
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    handleSizeChange(
                      editFormData,
                      setEditFormData,
                      "name",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div className='col-span-12 sm:col-span-5 space-y-1.5 sm:space-y-2'>
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  Category *
                </label>
                <Select
                  value={editFormData.category}
                  onValueChange={(val) =>
                    handleSizeChange(
                      editFormData,
                      setEditFormData,
                      "category",
                      val,
                    )
                  }
                >
                  <SelectTrigger className='bg-white'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='CHEMICAL'>Chemical</SelectItem>{" "}
                    <SelectItem value='CLEANING'>Cleaning Tools</SelectItem>
                    <SelectItem value='EQUIPMENT'>Equipment</SelectItem>
                    <SelectItem value='GLASSWARE'>Glassware</SelectItem>
                    <SelectItem value='Plasticware'>Plasticware</SelectItem>
                    <SelectItem value='Porcelain Ware'>
                      Porcelain Ware
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`col-span-6 ${editFormData.category === "CHEMICAL" ? "sm:col-span-4" : "sm:col-span-6"} space-y-1.5 sm:space-y-2`}
              >
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  {editFormData.category === "CHEMICAL"
                    ? "No. of Bottles *"
                    : "Quantity (Pieces) *"}
                </label>
                <Input
                  required
                  type='number'
                  step='1'
                  min='1'
                  value={editFormData.totalQuantity}
                  onChange={(e) =>
                    handleSizeChange(
                      editFormData,
                      setEditFormData,
                      "totalQuantity",
                      e.target.value,
                    )
                  }
                />
              </div>

              {editFormData.category === "CHEMICAL" && (
                <div className='col-span-6 sm:col-span-4 space-y-1.5 sm:space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase'>
                    Size per Bottle *
                  </label>
                  <Input
                    required
                    type='number'
                    step='0.01'
                    min='0.01'
                    placeholder='e.g. 1000'
                    value={editFormData.capacity}
                    onChange={(e) =>
                      handleSizeChange(
                        editFormData,
                        setEditFormData,
                        "capacity",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}

              <div
                className={`col-span-6 ${editFormData.category === "CHEMICAL" ? "sm:col-span-4" : "sm:col-span-6"} space-y-1.5 sm:space-y-2`}
              >
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  Unit *
                </label>
                <Select
                  value={editFormData.unit}
                  onValueChange={(val) =>
                    handleSizeChange(editFormData, setEditFormData, "unit", val)
                  }
                  disabled={isEditIndividualItems}
                >
                  <SelectTrigger
                    className={
                      isEditIndividualItems
                        ? "bg-slate-100 text-slate-400"
                        : "bg-white"
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ml'>ml</SelectItem>
                    <SelectItem value='g'>g</SelectItem>
                    <SelectItem value='kg'>kg</SelectItem>
                    <SelectItem value='L'>L</SelectItem>
                    <SelectItem value='pc/s'>pc/s</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isEditIndividualItems && (
                <div className='col-span-12 space-y-1.5 sm:space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase'>
                    Expiration Date
                  </label>
                  <Input
                    type='date'
                    value={editFormData.expirationDate}
                    onChange={(e) =>
                      handleSizeChange(
                        editFormData,
                        setEditFormData,
                        "expirationDate",
                        e.target.value,
                      )
                    }
                  />
                </div>
              )}
            </div>

            <div className='pt-4 border-t mt-4'>
              <label className='text-xs font-bold text-blue-600 uppercase mb-3 block'>
                {isEditAutoGenerated
                  ? `Control Numbers & Condition (${editFormData.instances.length} Pieces)`
                  : "Item Tracking *"}
              </label>

              <ScrollArea className='h-[350px] rounded-md border p-3 sm:p-4 bg-slate-50'>
                <div className='space-y-3'>
                  {editFormData.instances.map((inst, index) => (
                    <div key={index} className='flex items-center gap-2 w-full'>
                      {isEditAutoGenerated && (
                        <span className='text-xs sm:text-sm font-semibold text-slate-400 w-5 sm:w-6 shrink-0'>
                          #{index + 1}
                        </span>
                      )}
                      <Input
                        required
                        placeholder='Control No.'
                        className='font-mono bg-white flex-1 uppercase min-w-[100px] text-xs sm:text-sm'
                        value={inst.controlNumber}
                        onChange={(e) =>
                          isEditAutoGenerated
                            ? handleInstanceEdit(
                                index,
                                "controlNumber",
                                e.target.value,
                                true,
                              )
                            : handleEditInstanceChange(
                                index,
                                "controlNumber",
                                e.target.value,
                              )
                        }
                      />
                      <Select
                        value={inst.condition}
                        onValueChange={(val) =>
                          isEditAutoGenerated
                            ? handleInstanceEdit(index, "condition", val, true)
                            : handleEditInstanceChange(index, "condition", val)
                        }
                      >
                        <SelectTrigger className='w-[85px] sm:w-[110px] bg-white shrink-0 text-xs sm:text-sm'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Good'>Good</SelectItem>
                          <SelectItem value='Fair'>Fair</SelectItem>
                          <SelectItem value='Damaged'>Damaged</SelectItem>
                        </SelectContent>
                      </Select>

                      {!isEditAutoGenerated && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            removeInstance(index, editFormData, setEditFormData)
                          }
                          className='text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10'
                        >
                          <X className='w-4 h-4' />
                        </Button>
                      )}
                    </div>
                  ))}

                  {!isEditAutoGenerated && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => addInstance(editFormData, setEditFormData)}
                      className='w-full mt-2 border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-300'
                    >
                      <Plus className='w-4 h-4 mr-2' /> Add Item
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className='flex justify-end pt-4 gap-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setIsEditModalOpen(false)}
                className='flex-1 sm:flex-none'
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isUploading}
                className='bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none'
              >
                {isUploading ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />{" "}
                    Uploading...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DELETE ALERT --- */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent className='w-[95vw] sm:max-w-md rounded-lg'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600'>
              Delete Inventory Item
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-700'>
              Are you sure you want to delete{" "}
              <strong>{selectedItem?.name}</strong>? This will permanently
              remove it and all of its associated control numbers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-col sm:flex-row gap-2 mt-4'>
            <AlertDialogCancel
              className='mt-0 flex-1'
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className='bg-red-600 hover:bg-red-700 text-white flex-1'
            >
              Yes, Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageInventory;