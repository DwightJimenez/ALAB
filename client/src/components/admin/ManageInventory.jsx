import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X, UploadCloud, Loader2, Printer, Barcode } from "lucide-react";
import BarcodeComponent from "react-barcode";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { createClient } from "@supabase/supabase-js";

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

  const [showStickerPrint, setShowStickerPrint] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const getInitialForm = () => ({
    name: "",
    category: "CHEMICAL",
    imageUrl: "",
    quantity: 1,
    unit: "ml",
    expirationDate: "",
    instances: [{ controlNumber: "", condition: "Good" }],
  });

  const [formData, setFormData] = useState(getInitialForm());
  const [editFormData, setEditFormData] = useState(getInitialForm());

  const isIndividualCategory = (category) =>
    ["EQUIPMENT", "GLASSWARE", "CLEANING"].includes(category);

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

  // --- Shared Logic ---
  const handleSizeChange = (currentData, setter, field, value) => {
    let updated = { ...currentData, [field]: value };

    if (field === "category") {
      if (isIndividualCategory(value)) {
        updated.unit = "pc/s";
        updated.expirationDate = "";
        updated.instances = [{ controlNumber: "", condition: "Good" }];
        updated.totalQuantity = 1;
      } else {
        updated.instances = [{ controlNumber: "", condition: "Good" }];
      }
    }

    if (field === "totalQuantity" && !isIndividualCategory(updated.category)) {
      updated.totalQuantity = value;
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

  // --- IMAGE UPLOAD LOGIC ---
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

  // --- CREATE Logic ---
  const handleInstanceChange = (index, field, value) => {
    const newInstances = [...formData.instances];
    newInstances[index][field] = value;
    setFormData({ ...formData, instances: newInstances });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading)
      return toast.error("Please wait for the image to finish uploading.");

    const isIndividual = isIndividualCategory(formData.category);

    if (formData.instances.some((inst) => !inst.controlNumber.trim())) {
      toast.error("Please fill in all Control Numbers.");
      return;
    }

    const payload = {
      ...formData,
      instances: formData.instances.map((inst) => ({
        ...inst,
        expirationDate: !isIndividual ? formData.expirationDate : null,
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
      totalQuantity: item.totalQuantity || 1,
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

  const handleEditInstanceChange = (index, field, value) => {
    const newInstances = [...editFormData.instances];
    newInstances[index][field] = value;
    setEditFormData({ ...editFormData, instances: newInstances });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isUploading)
      return toast.error("Please wait for the image to finish uploading.");

    const isIndividual = isIndividualCategory(editFormData.category);

    if (editFormData.instances.some((inst) => !inst.controlNumber.trim())) {
      toast.error("Please fill in all Control Numbers.");
      return;
    }

    const payload = {
      ...editFormData,
      instances: editFormData.instances.map((inst) => ({
        ...inst,
        expirationDate: !isIndividual ? editFormData.expirationDate : null,
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

  // View Variables
  const isIndividualItems = isIndividualCategory(formData.category);
  const isEditIndividualItems = isIndividualCategory(editFormData.category);

  // ==========================================
  // --- RENDER: STICKER PRINT VIEW ---
  // ==========================================
  if (showStickerPrint) {
    return (
      <div className='bg-white min-h-screen p-8 print:p-0 print:m-0'>
        {/* Navigation - Hidden during actual print */}
        <div className='flex justify-between items-center mb-8 print:hidden border-b pb-4'>
          <div>
            <h2 className='text-2xl font-bold text-slate-800'>
              Print Barcode Stickers
            </h2>
            <p className='text-sm text-slate-500'>
              Press Print to generate labels for all items.
            </p>
          </div>
          <div className='flex gap-3'>
            <Button
              variant='outline'
              onClick={() => setShowStickerPrint(false)}
            >
              Back to Dashboard
            </Button>
            <Button
              className='bg-blue-600 hover:bg-blue-700 text-white'
              onClick={() => window.print()}
            >
              <Printer className='w-4 h-4 mr-2' /> Print Now
            </Button>
          </div>
        </div>

        {/* Sticker Grid - Visible during print */}
        <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4 print:gap-4 print:bg-white'>
          {items.map((item) =>
            item.instances?.map(
              (inst, idx) =>
                inst.controlNumber && (
                  <div
                    key={`${item.id}-${idx}`}
                    className='flex flex-col items-center justify-center p-4 border rounded-lg bg-white break-inside-avoid shadow-sm print:shadow-none print:border-slate-300'
                  >
                    <span className='text-xs font-bold text-slate-800 mb-2 truncate w-full text-center'>
                      {item.name}
                    </span>
                    <BarcodeComponent
                      value={inst.controlNumber}
                      width={1.5}
                      height={40}
                      fontSize={12}
                      displayValue={true}
                      margin={0}
                    />
                  </div>
                ),
            ),
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // --- RENDER: MAIN INVENTORY DASHBOARD ---
  // ==========================================
  return (
    <div className='bg-white p-6 m-5 rounded-lg border-2 w-full'>
      {/* --- HEADER & CONTROLS --- */}
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-2xl font-bold tracking-tight text-slate-900'>
          Laboratory Inventory
        </h2>

        <div className='flex items-center space-x-3 print:hidden'>
          <Button
            variant='outline'
            className='text-blue-600 border-blue-200 hover:bg-blue-50'
            onClick={() => setShowStickerPrint(true)}
          >
            <Barcode className='w-4 h-4 mr-2' /> Print Stickers
          </Button>

          {/* --- CREATE MODAL --- */}
          <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
              setIsModalOpen(open);
              if (!open) setFormData(getInitialForm());
            }}
          >
            <DialogTrigger asChild>
              <Button className='bg-pink-600 hover:bg-pink-700 text-white'>
                <Plus className='w-4 h-4 mr-2' /> Add Inventory
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[700px]'>
              <DialogHeader>
                <DialogTitle className='text-xl text-pink-600'>
                  Add Inventory Items
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
                <div className='grid grid-cols-12 gap-4'>
                  {/* Image Upload Area */}
                  <div className='col-span-12'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Item Image
                    </label>
                    <div className='mt-1 flex items-center gap-4'>
                      {formData.imageUrl ? (
                        <div className='relative h-16 w-16 rounded-md border overflow-hidden'>
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
                        <div className='h-16 w-16 rounded-md border border-dashed flex items-center justify-center bg-slate-50 text-slate-400'>
                          {isUploading ? (
                            <Loader2 className='w-5 h-5 animate-spin' />
                          ) : (
                            <UploadCloud className='w-5 h-5' />
                          )}
                        </div>
                      )}
                      <div className='flex-1'>
                        <Input
                          type='file'
                          accept='image/*'
                          onChange={(e) =>
                            handleImageUpload(e, formData, setFormData)
                          }
                          disabled={isUploading}
                          className='file:text-pink-600 file:bg-pink-50 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-sm file:font-semibold hover:file:bg-pink-100 cursor-pointer'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='col-span-12 sm:col-span-7 space-y-2'>
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
                  <div className='col-span-12 sm:col-span-5 space-y-2'>
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
                        <SelectItem value='CHEMICAL'>Chemical</SelectItem>
                        <SelectItem value='GLASSWARE'>Glassware</SelectItem>
                        <SelectItem value='EQUIPMENT'>Equipment</SelectItem>
                        <SelectItem value='CLEANING'>Cleaning Tools</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='col-span-6 space-y-2'>
                    <label className='text-xs font-bold text-slate-500 uppercase'>
                      Quantity *
                    </label>
                    <Input
                      required
                      type='number'
                      step={isIndividualItems ? "1" : "0.01"}
                      min='1'
                      value={
                        isIndividualItems
                          ? formData.instances.length
                          : formData.totalQuantity
                      }
                      onChange={(e) =>
                        handleSizeChange(
                          formData,
                          setFormData,
                          "totalQuantity",
                          e.target.value,
                        )
                      }
                      disabled={isIndividualItems}
                      className={
                        isIndividualItems
                          ? "bg-slate-100 text-slate-500 font-bold"
                          : ""
                      }
                    />
                  </div>
                  <div className='col-span-6 space-y-2'>
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
                        {/* ✅ Added pc/s */}
                        <SelectItem value='pc/s'>pc/s</SelectItem> 
                      </SelectContent>
                    </Select>
                  </div>
                  {!isIndividualItems && (
                    <div className='col-span-12 space-y-2'>
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

                {/* DYNAMIC CONTROL NUMBERS */}
                <div className='pt-4 border-t mt-4'>
                  <label className='text-xs font-bold text-pink-600 uppercase mb-3 block'>
                    {isIndividualItems
                      ? `Assign Control Numbers & Condition (${formData.instances.length} Pieces)`
                      : "Item Tracking *"}
                  </label>

                  <ScrollArea className='max-h-[250px] rounded-md border p-4 bg-slate-50'>
                    <div className='space-y-3'>
                      {formData.instances.map((inst, index) => (
                        <div
                          key={index}
                          className='flex items-center space-x-2'
                        >
                          {isIndividualItems && (
                            <span className='text-sm font-semibold text-slate-400 w-6'>
                              #{index + 1}
                            </span>
                          )}
                          <Input
                            required
                            placeholder='Control No.'
                            className='font-mono bg-white flex-1'
                            value={inst.controlNumber}
                            onChange={(e) =>
                              handleInstanceChange(
                                index,
                                "controlNumber",
                                e.target.value,
                              )
                            }
                          />
                          <Select
                            value={inst.condition}
                            onValueChange={(val) =>
                              handleInstanceChange(index, "condition", val)
                            }
                          >
                            <SelectTrigger className='w-[110px] bg-white'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='Good'>Good</SelectItem>
                              <SelectItem value='Fair'>Fair</SelectItem>
                              <SelectItem value='Damaged'>Damaged</SelectItem>
                            </SelectContent>
                          </Select>

                          {isIndividualItems && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() =>
                                removeInstance(index, formData, setFormData)
                              }
                              className='text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0'
                            >
                              <X className='w-4 h-4' />
                            </Button>
                          )}
                        </div>
                      ))}

                      {isIndividualItems && (
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

                <div className='flex justify-end pt-4 space-x-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={isUploading}
                    className='bg-pink-600 hover:bg-pink-700 text-white'
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

      {/* --- INVENTORY TABLE --- */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader className='bg-slate-50'>
            <TableRow>
              <TableHead className='w-[80px]'>Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className='min-w-[350px] w-[400px]'>
                Instances (Control Number)
              </TableHead>
              <TableHead className='text-right'>Total Stock</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-24 text-center text-slate-500'
                >
                  No items.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className='items-start'>
                  <TableCell className='align-top py-4'>
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
                  <TableCell className='font-medium text-slate-800 align-top py-4'>
                    {item.name}
                  </TableCell>
                  <TableCell className='align-top py-4'>
                    <span className='px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700'>
                      {item.category === "CLEANING"
                        ? "CLEANING TOOLS"
                        : item.category}
                    </span>
                  </TableCell>

                  {/* --- ACCORDION TABLE CELL --- */}
                  <TableCell className='align-top py-2'>
                    {item.instances && item.instances.length > 0 ? (
                      <Accordion type='single' collapsible className='w-full'>
                        <AccordionItem
                          value={`item-${item.id}`}
                          className='border-b-0'
                        >
                          <AccordionTrigger className='py-2 text-sm text-slate-600 hover:text-slate-900 hover:no-underline'>
                            View {item.instances.length} Item(s)
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className='max-h-[350px] overflow-y-auto w-full rounded-md border p-2 bg-slate-50/50'>
                              <div className='space-y-4'>
                                {item.instances.map((inst, idx) => (
                                  <div
                                    key={idx}
                                    className='flex flex-col gap-2 p-3 rounded-md border bg-white shadow-sm'
                                  >
                                    <div className='flex justify-between items-center'>
                                      <div className='flex flex-col'>
                                        <span className='font-semibold font-mono text-sm text-slate-800'>
                                          {inst.controlNumber}
                                        </span>
                                        {item.category === "CHEMICAL" && inst.capacity && (
                                          <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                                            Volume: {inst.quantity} / {inst.capacity} {item.unit}
                                          </span>
                                        )}
                                      </div>

                                      <span
                                        className={`ml-3 text-[11px] px-2 py-0.5 rounded border font-medium
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

                                    {/* Scannable Barcode Render based on Control Number */}
                                    {inst.controlNumber ? (
                                      <div className='mt-2 flex justify-center bg-white rounded border border-slate-200 p-3 overflow-x-auto shadow-inner'>
                                        <BarcodeComponent
                                          value={inst.controlNumber}
                                          width={1.2}
                                          height={35}
                                          fontSize={10}
                                          displayValue={true}
                                        />
                                      </div>
                                    ) : (
                                      <span className='text-xs text-slate-400 italic'>
                                        No control number
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    ) : (
                      <span className='text-slate-400 text-sm'>No items</span>
                    )}
                  </TableCell>

                  <TableCell className='text-right font-medium align-top py-4'>
                    {item.totalQuantity} {item.unit}
                  </TableCell>

                  <TableCell className='text-right align-top py-4'>
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
                      className='text-red-600 hover:bg-red-50 ml-2'
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
        <DialogContent className='sm:max-w-[700px]'>
          <DialogHeader>
            <DialogTitle className='text-xl text-blue-600'>
              Edit Inventory Item
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className='mt-4 space-y-4'>
            <div className='grid grid-cols-12 gap-4'>
              {/* Edit Image Upload Area */}
              <div className='col-span-12'>
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  Item Image
                </label>
                <div className='mt-1 flex items-center gap-4'>
                  {editFormData.imageUrl ? (
                    <div className='relative h-16 w-16 rounded-md border overflow-hidden'>
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
                    <div className='h-16 w-16 rounded-md border border-dashed flex items-center justify-center bg-slate-50 text-slate-400'>
                      {isUploading ? (
                        <Loader2 className='w-5 h-5 animate-spin' />
                      ) : (
                        <UploadCloud className='w-5 h-5' />
                      )}
                    </div>
                  )}
                  <div className='flex-1'>
                    <Input
                      type='file'
                      accept='image/*'
                      onChange={(e) =>
                        handleImageUpload(e, editFormData, setEditFormData)
                      }
                      disabled={isUploading}
                      className='file:text-blue-600 file:bg-blue-50 file:border-0 file:rounded-md file:px-2 file:py-1 file:mr-2 file:text-sm file:font-semibold hover:file:bg-blue-100 cursor-pointer'
                    />
                  </div>
                </div>
              </div>

              <div className='col-span-12 sm:col-span-7 space-y-2'>
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
              <div className='col-span-12 sm:col-span-5 space-y-2'>
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
                    <SelectItem value='CHEMICAL'>Chemical</SelectItem>
                    <SelectItem value='GLASSWARE'>Glassware</SelectItem>
                    <SelectItem value='EQUIPMENT'>Equipment</SelectItem>
                    <SelectItem value='CLEANING'>Cleaning Tools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='col-span-6 space-y-2'>
                <label className='text-xs font-bold text-slate-500 uppercase'>
                  Quantity *
                </label>
                <Input
                  required
                  type='number'
                  step={isEditIndividualItems ? "1" : "0.01"}
                  min='1'
                  value={
                    isEditIndividualItems
                      ? editFormData.instances.length
                      : editFormData.totalQuantity
                  }
                  onChange={(e) =>
                    handleSizeChange(
                      editFormData,
                      setEditFormData,
                      "totalQuantity",
                      e.target.value,
                    )
                  }
                  disabled={isEditIndividualItems}
                  className={
                    isEditIndividualItems
                      ? "bg-slate-100 text-slate-500 font-bold"
                      : ""
                  }
                />
              </div>
              <div className='col-span-6 space-y-2'>
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
                    {/* ✅ Added pc/s */}
                    <SelectItem value='pc/s'>pc/s</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isEditIndividualItems && (
                <div className='col-span-12 space-y-2'>
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
                {isEditIndividualItems
                  ? `Assign Control Numbers & Condition (${editFormData.instances.length} Pieces)`
                  : "Item Tracking *"}
              </label>

              <ScrollArea className='max-h-[250px] rounded-md border p-4 bg-slate-50'>
                <div className='space-y-3'>
                  {editFormData.instances.map((inst, index) => (
                    <div key={index} className='flex items-center space-x-2'>
                      {isEditIndividualItems && (
                        <span className='text-sm font-semibold text-slate-400 w-6'>
                          #{index + 1}
                        </span>
                      )}
                      <Input
                        required
                        placeholder='Control No.'
                        className='font-mono bg-white flex-1'
                        value={inst.controlNumber}
                        onChange={(e) =>
                          handleEditInstanceChange(
                            index,
                            "controlNumber",
                            e.target.value,
                          )
                        }
                      />
                      <Select
                        value={inst.condition}
                        onValueChange={(val) =>
                          handleEditInstanceChange(index, "condition", val)
                        }
                      >
                        <SelectTrigger className='w-[110px] bg-white'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Good'>Good</SelectItem>
                          <SelectItem value='Fair'>Fair</SelectItem>
                          <SelectItem value='Damaged'>Damaged</SelectItem>
                        </SelectContent>
                      </Select>

                      {isEditIndividualItems && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            removeInstance(index, editFormData, setEditFormData)
                          }
                          className='text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0'
                        >
                          <X className='w-4 h-4' />
                        </Button>
                      )}
                    </div>
                  ))}

                  {isEditIndividualItems && (
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

            <div className='flex justify-end pt-4 space-x-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={isUploading}
                className='bg-blue-600 hover:bg-blue-700 text-white'
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
        <AlertDialogContent>
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
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className='bg-red-600 hover:bg-red-700 text-white'
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