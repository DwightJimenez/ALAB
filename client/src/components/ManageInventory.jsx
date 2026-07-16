import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

const ManageInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  const getInitialForm = () => ({
    name: "",
    category: "CHEMICAL",
    imageUrl: "",
    totalQuantity: "",
    unit: "ml",
    expirationDate: "",
    instances: [{ controlNumber: "", condition: "Good" }], // Now holds objects with condition
  });

  const [formData, setFormData] = useState(getInitialForm());

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
      setError("Could not fetch inventory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleChange = (field, value) => {
    let updated = { ...formData, [field]: value };

    if (field === "category") {
      if (value === "EQUIPMENT" || value === "GLASSWARE") {
        updated.unit = "pcs";
        updated.expirationDate = "";
        const qty = parseInt(updated.totalQuantity) || 1;
        updated.totalQuantity = qty;
        
        // Remap instances based on quantity
        updated.instances = Array(qty).fill(null).map((_, i) => 
          updated.instances[i] || { controlNumber: "", condition: "Good" }
        );
      } else {
        updated.instances = [updated.instances[0] || { controlNumber: "", condition: "Good" }];
      }
    }

    if (field === "totalQuantity" && (formData.category === "EQUIPMENT" || formData.category === "GLASSWARE")) {
      const qty = parseInt(value) || 0;
      updated.instances = Array(qty).fill(null).map((_, i) => 
        updated.instances[i] || { controlNumber: "", condition: "Good" }
      );
    }

    setFormData(updated);
  };

  const handleInstanceChange = (index, field, value) => {
    const newInstances = [...formData.instances];
    newInstances[index][field] = value;
    setFormData({ ...formData, instances: newInstances });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // Validate control numbers
    if (formData.instances.some(inst => !inst.controlNumber.trim())) {
      setSubmitError("Please fill in all generated Control Numbers.");
      return;
    }

    // Attach expiration date to instances if it's a chemical
    const payload = {
      ...formData,
      instances: formData.instances.map(inst => ({
        ...inst,
        expirationDate: formData.category === "CHEMICAL" ? formData.expirationDate : null
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
      if (!response.ok) return setSubmitError(data.error);

      setIsModalOpen(false);
      setFormData(getInitialForm());
      fetchInventory();
    } catch (err) {
      setSubmitError("Failed to connect to the server.");
    }
  };

  const isIndividualItems = formData.category === "EQUIPMENT" || formData.category === "GLASSWARE";

  return (
    <div className="bg-white p-6 m-5 rounded-lg border-2 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Laboratory Inventory</h2>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if (!open) setFormData(getInitialForm()); }}>
          <DialogTrigger asChild>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">+ Add Inventory</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-pink-600">Add Inventory Items</DialogTitle>
            </DialogHeader>

            {submitError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{submitError}</p>}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <label className="text-xs font-bold text-slate-500 uppercase">Image URL (Optional)</label>
                  <Input value={formData.imageUrl} onChange={(e) => handleChange("imageUrl", e.target.value)} />
                </div>
                <div className="col-span-12 sm:col-span-7 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Item Name *</label>
                  <Input required placeholder="Microscope, Beaker, etc." value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />
                </div>
                <div className="col-span-12 sm:col-span-5 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category *</label>
                  <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                    <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHEMICAL">Chemical</SelectItem>
                      <SelectItem value="GLASSWARE">Glassware</SelectItem>
                      <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Quantity *</label>
                  <Input required type="number" step={isIndividualItems ? "1" : "0.01"} min="1" value={formData.totalQuantity} onChange={(e) => handleChange("totalQuantity", e.target.value)} />
                </div>
                <div className="col-span-6 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit *</label>
                  <Select value={formData.unit} onValueChange={(value) => handleChange("unit", value)} disabled={isIndividualItems}>
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
                    <Input type="date" value={formData.expirationDate} onChange={(e) => handleChange("expirationDate", e.target.value)} />
                  </div>
                )}
              </div>

              {/* DYNAMIC CONTROL NUMBERS & CONDITIONS */}
              <div className="pt-4 border-t mt-4">
                <label className="text-xs font-bold text-pink-600 uppercase mb-3 block">
                  {isIndividualItems ? `Assign Control Numbers & Condition (${formData.totalQuantity || 0} Pieces)` : "Control Number *"}
                </label>
                
                <ScrollArea className="max-h-[250px] rounded-md border p-4 bg-slate-50">
                  <div className="space-y-3">
                    {formData.instances.map((inst, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        {isIndividualItems && <span className="text-sm font-semibold text-slate-400 w-6">#{index + 1}</span>}
                        
                        <Input
                          required
                          placeholder="CTRL-001"
                          className="font-mono bg-white flex-1"
                          value={inst.controlNumber}
                          onChange={(e) => handleInstanceChange(index, "controlNumber", e.target.value)}
                        />

                        <Select 
                          value={inst.condition} 
                          onValueChange={(val) => handleInstanceChange(index, "condition", val)}
                        >
                          <SelectTrigger className="w-[130px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
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

      {/* INVENTORY TABLE - Now displays nested instances */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Condition / Control No.</TableHead>
              <TableHead className="text-right">Total Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500">No items.</TableCell></TableRow>
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
                      {item.category}
                    </span>
                  </TableCell>
                  
                  {/* Shows all control numbers and conditions associated with this item */}
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageInventory;