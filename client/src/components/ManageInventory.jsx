import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const ManageInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const getInitialForm = () => ({
    name: "",
    category: "CHEMICAL",
    imageUrl: "",
    totalQuantity: 1,
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
      const response = await fetch(`${API_URL}/api/inventory`, {
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
        updated.unit = "pcs";
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

  // Add a new row
  const addInstance = (currentData, setter) => {
    const newInstances = [...currentData.instances, { controlNumber: "", condition: "Good" }];
    setter({ ...currentData, instances: newInstances, totalQuantity: newInstances.length });
  };

  // Remove a specific row
  const removeInstance = (index, currentData, setter) => {
    if (currentData.instances.length <= 1) {
      toast.error("You must have at least one item.");
      return;
    }
    const newInstances = currentData.instances.filter((_, i) => i !== index);
    setter({ ...currentData, instances: newInstances, totalQuantity: newInstances.length });
  };


  // --- CREATE Logic ---
  const handleInstanceChange = (index, field, value) => {
    const newInstances = [...formData.instances];
    newInstances[index][field] = value;
    setFormData({ ...formData, instances: newInstances });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isIndividual = isIndividualCategory(formData.category);

    if (formData.instances.some(inst => !inst.controlNumber.trim())) {
      toast.error("Please fill in all Control Numbers.");
      return;
    }

    const payload = {
      ...formData,
      instances: formData.instances.map(inst => ({
        ...inst,
        expirationDate: !isIndividual ? formData.expirationDate : null
      }))
    };

    try {
      const response = await fetch(`${API_URL}/api/inventory/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) return toast.error(data.error || "Failed to add inventory.");

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
      expirationDate: item.instances && item.instances[0]?.expirationDate 
        ? item.instances[0].expirationDate.split("T")[0] 
        : "",
      instances: item.instances && item.instances.length > 0 
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
    const isIndividual = isIndividualCategory(editFormData.category);

    if (editFormData.instances.some(inst => !inst.controlNumber.trim())) {
      toast.error("Please fill in all Control Numbers.");
      return;
    }

    const payload = {
      ...editFormData,
      instances: editFormData.instances.map(inst => ({
        ...inst,
        expirationDate: !isIndividual ? editFormData.expirationDate : null
      }))
    };

    try {
      const response = await fetch(`${API_URL}/api/inventory/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

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
      const response = await fetch(`${API_URL}/api/inventory/${selectedItem.id}`, {
        method: "DELETE",
        credentials: "include",
      });

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

  return (
    <div className="bg-white p-6 m-5 rounded-lg border-2 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Laboratory Inventory</h2>

        {/* --- CREATE MODAL --- */}
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setFormData(getInitialForm()); }}>
          <DialogTrigger asChild>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">+ Add Inventory</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-pink-600">Add Inventory Items</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <label className="text-xs font-bold text-slate-500 uppercase">Image URL (Optional)</label>
                  <Input value={formData.imageUrl} onChange={(e) => handleSizeChange(formData, setFormData, "imageUrl", e.target.value)} />
                </div>
                <div className="col-span-12 sm:col-span-7 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Item Name *</label>
                  <Input required value={formData.name} onChange={(e) => handleSizeChange(formData, setFormData, "name", e.target.value)} />
                </div>
                <div className="col-span-12 sm:col-span-5 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category *</label>
                  <Select value={formData.category} onValueChange={(val) => handleSizeChange(formData, setFormData, "category", val)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHEMICAL">Chemical</SelectItem>
                      <SelectItem value="GLASSWARE">Glassware</SelectItem>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                      <SelectItem value="CLEANING">Cleaning Tools</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantity *</label>
                  {/* Quantity becomes read-only if it's an individual item (Equipment/Glass/Cleaning) */}
                  <Input 
                    required 
                    type="number" 
                    step={isIndividualItems ? "1" : "0.01"} 
                    min="1" 
                    value={isIndividualItems ? formData.instances.length : formData.totalQuantity} 
                    onChange={(e) => handleSizeChange(formData, setFormData, "totalQuantity", e.target.value)} 
                    disabled={isIndividualItems}
                    className={isIndividualItems ? "bg-slate-100 text-slate-500 font-bold" : ""}
                  />
                </div>
                <div className="col-span-6 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit *</label>
                  <Select value={formData.unit} onValueChange={(val) => handleSizeChange(formData, setFormData, "unit", val)} disabled={isIndividualItems}>
                    <SelectTrigger className={isIndividualItems ? "bg-slate-100 text-slate-400" : "bg-white"}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isIndividualItems && (
                  <div className="col-span-12 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Expiration Date</label>
                    <Input type="date" value={formData.expirationDate} onChange={(e) => handleSizeChange(formData, setFormData, "expirationDate", e.target.value)} />
                  </div>
                )}
              </div>

              {/* DYNAMIC CONTROL NUMBERS */}
              <div className="pt-4 border-t mt-4">
                <label className="text-xs font-bold text-pink-600 uppercase mb-3 block">
                  {isIndividualItems ? `Assign Control Numbers & Condition (${formData.instances.length} Pieces)` : "Control Number *"}
                </label>
                
                <ScrollArea className="max-h-[250px] rounded-md border p-4 bg-slate-50">
                  <div className="space-y-3">
                    {formData.instances.map((inst, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {isIndividualItems && <span className="text-sm font-semibold text-slate-400 w-6">#{index + 1}</span>}
                        <Input
                          required
                          placeholder="CTRL-001"
                          className="font-mono bg-white flex-1"
                          value={inst.controlNumber}
                          onChange={(e) => handleInstanceChange(index, "controlNumber", e.target.value)}
                        />
                        <Select value={inst.condition} onValueChange={(val) => handleInstanceChange(index, "condition", val)}>
                          <SelectTrigger className="w-[110px] bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Remove Row Button */}
                        {isIndividualItems && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeInstance(index, formData, setFormData)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    {/* Add Row Button */}
                    {isIndividualItems && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addInstance(formData, setFormData)}
                        className="w-full mt-2 border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-300"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Item
                      </Button>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-end pt-4 space-x-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white">Save Inventory</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* --- INVENTORY TABLE --- */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition / Control No.</TableHead>
              <TableHead className="text-right">Total Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500">No items.</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-cover rounded-md border" />
                    ) : (
                      <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400 border">N/A</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">{item.name}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                      {item.category === 'CLEANING' ? 'CLEANING TOOLS' : item.category}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {item.instances && item.instances.map(inst => (
                        <span key={inst.id} className={`text-[10px] px-1.5 py-0.5 rounded border 
                          ${inst.condition === 'Good' ? 'border-green-200 bg-green-50 text-green-700' : 
                            inst.condition === 'Fair' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' : 
                            'border-red-200 bg-red-50 text-red-700'}`}>
                          {inst.controlNumber}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.totalQuantity} {item.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditModal(item)} 
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openDeleteModal(item)} 
                      className="text-red-600 hover:bg-red-50 ml-2"
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-600">Edit Inventory Item</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <label className="text-xs font-bold text-slate-500 uppercase">Image URL (Optional)</label>
                <Input value={editFormData.imageUrl} onChange={(e) => handleSizeChange(editFormData, setEditFormData, "imageUrl", e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-7 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Item Name *</label>
                <Input required value={editFormData.name} onChange={(e) => handleSizeChange(editFormData, setEditFormData, "name", e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-5 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Category *</label>
                <Select value={editFormData.category} onValueChange={(val) => handleSizeChange(editFormData, setEditFormData, "category", val)}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHEMICAL">Chemical</SelectItem>
                    <SelectItem value="GLASSWARE">Glassware</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                    <SelectItem value="CLEANING">Cleaning Tools</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Quantity *</label>
                <Input 
                  required 
                  type="number" 
                  step={isEditIndividualItems ? "1" : "0.01"} 
                  min="1" 
                  value={isEditIndividualItems ? editFormData.instances.length : editFormData.totalQuantity} 
                  onChange={(e) => handleSizeChange(editFormData, setEditFormData, "totalQuantity", e.target.value)} 
                  disabled={isEditIndividualItems}
                  className={isEditIndividualItems ? "bg-slate-100 text-slate-500 font-bold" : ""}
                />
              </div>
              <div className="col-span-6 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Unit *</label>
                <Select value={editFormData.unit} onValueChange={(val) => handleSizeChange(editFormData, setEditFormData, "unit", val)} disabled={isEditIndividualItems}>
                  <SelectTrigger className={isEditIndividualItems ? "bg-slate-100 text-slate-400" : "bg-white"}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isEditIndividualItems && (
                <div className="col-span-12 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Expiration Date</label>
                  <Input type="date" value={editFormData.expirationDate} onChange={(e) => handleSizeChange(editFormData, setEditFormData, "expirationDate", e.target.value)} />
                </div>
              )}
            </div>

            <div className="pt-4 border-t mt-4">
              <label className="text-xs font-bold text-blue-600 uppercase mb-3 block">
                {isEditIndividualItems ? `Assign Control Numbers & Condition (${editFormData.instances.length} Pieces)` : "Control Number *"}
              </label>
              
              <ScrollArea className="max-h-[250px] rounded-md border p-4 bg-slate-50">
                <div className="space-y-3">
                  {editFormData.instances.map((inst, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {isEditIndividualItems && <span className="text-sm font-semibold text-slate-400 w-6">#{index + 1}</span>}
                      <Input
                        required
                        placeholder="CTRL-001"
                        className="font-mono bg-white flex-1"
                        value={inst.controlNumber}
                        onChange={(e) => handleEditInstanceChange(index, "controlNumber", e.target.value)}
                      />
                      <Select value={inst.condition} onValueChange={(val) => handleEditInstanceChange(index, "condition", val)}>
                        <SelectTrigger className="w-[110px] bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Good</SelectItem>
                          <SelectItem value="Fair">Fair</SelectItem>
                          <SelectItem value="Damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {/* Remove Row Button */}
                      {isEditIndividualItems && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeInstance(index, editFormData, setEditFormData)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Add Row Button */}
                  {isEditIndividualItems && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => addInstance(editFormData, setEditFormData)}
                      className="w-full mt-2 border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-300"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- DELETE ALERT --- */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700">
              Are you sure you want to delete <strong>{selectedItem?.name}</strong>? 
              This will permanently remove it and all of its associated control numbers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault(); 
                handleDeleteConfirm();
              }} 
              className="bg-red-600 hover:bg-red-700 text-white"
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