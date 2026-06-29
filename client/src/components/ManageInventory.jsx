import React, { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area"; // Add this component if you have it, or just use a standard div with overflow-y-auto

const ManageInventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // 1. STATE IS NOW AN ARRAY FOR BATCH PROCESSING
  const getEmptyItem = () => ({
    controlNumber: "",
    name: "",
    category: "CHEMICAL",
    quantity: "",
    unit: "ml",
    expirationDate: "",
    imageUrl: "",
  });

  const [batchItems, setBatchItems] = useState([getEmptyItem()]);

  const fetchInventory = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/inventory", {
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

  // 2. DYNAMIC FORM HANDLERS
  const handleBatchChange = (index, field, value) => {
    const updatedBatch = [...batchItems];
    updatedBatch[index][field] = value;

    // Enforce category logic dynamically
    if (field === "category") {
      if (value !== "CHEMICAL") {
        updatedBatch[index]["expirationDate"] = "";
      }

      // Auto-set to 1 pc if Equipment
      if (value === "EQUIPMENT") {
        updatedBatch[index]["quantity"] = 1;
        updatedBatch[index]["unit"] = "pcs";
      } else {
        // Clear the auto-fill if they switch back to something else
        if (updatedBatch[index]["quantity"] === 1) {
          updatedBatch[index]["quantity"] = "";
        }
      }
    }

    setBatchItems(updatedBatch);
  };

  const addBatchRow = () => {
    setBatchItems([...batchItems, getEmptyItem()]);
  };

  const removeBatchRow = (index) => {
    const updatedBatch = batchItems.filter((_, i) => i !== index);
    setBatchItems(updatedBatch);
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/inventory/batch",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ items: batchItems }), // Send the whole array
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.error);
        return;
      }

      setIsModalOpen(false);
      setBatchItems([getEmptyItem()]); // Reset to 1 empty row
      fetchInventory();
    } catch (err) {
      setSubmitError("Failed to connect to the server.");
    }
  };

  return (
    <div className="bg-white p-6 m-5 rounded-lg shadow-sm border-2 border-purple-600 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Laboratory Inventory
        </h2>

        {/* BATCH CREATION MODAL */}
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setBatchItems([getEmptyItem()]); // Reset on close
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">
              + Batch Add Items
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle className="text-xl text-pink-600">
                Batch Add to Inventory
              </DialogTitle>
            </DialogHeader>

            {submitError && (
              <p className="text-red-500 text-sm bg-red-50 p-2 rounded">
                {submitError}
              </p>
            )}

            <form onSubmit={handleBatchSubmit} className="mt-4">
              {/* Scrollable area for multiple items */}
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
                {batchItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50 relative"
                  >
                    {/* Remove Row Button (Only show if there is more than 1 row) */}
                    {batchItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBatchRow(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm font-semibold"
                      >
                        ✕ Remove
                      </button>
                    )}

                    <div className="grid grid-cols-12 gap-4">
                      {/* Row 1: Image URL and Control Number */}
                      <div className="col-span-12 sm:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Image URL (Optional)
                        </label>
                        <Input
                          placeholder="https://..."
                          value={item.imageUrl}
                          onChange={(e) =>
                            handleBatchChange(index, "imageUrl", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-3 space-y-2">
                        <label className="text-xs font-bold text-pink-600 uppercase">
                          Ctrl Number *
                        </label>
                        <Input
                          required
                          placeholder="CTRL-001"
                          className="font-mono bg-white"
                          value={item.controlNumber}
                          onChange={(e) =>
                            handleBatchChange(
                              index,
                              "controlNumber",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-5 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Item Name *
                        </label>
                        <Input
                          required
                          placeholder="Microscope"
                          value={item.name}
                          onChange={(e) =>
                            handleBatchChange(index, "name", e.target.value)
                          }
                        />
                      </div>

                      {/* Row 2: Specs */}
                      <div className="col-span-12 sm:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Category *
                        </label>
                        <Select
                          value={item.category}
                          onValueChange={(value) =>
                            handleBatchChange(index, "category", value)
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CHEMICAL">Chemical</SelectItem>
                            <SelectItem value="GLASSWARE">Glassware</SelectItem>
                            <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* QUANTITY INPUT */}
                      <div className="col-span-6 sm:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Qty *
                        </label>
                        <Input
                          required
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            handleBatchChange(index, "quantity", e.target.value)
                          }
                          disabled={item.category === "EQUIPMENT"}
                          className={
                            item.category === "EQUIPMENT"
                              ? "bg-slate-100 text-slate-400"
                              : ""
                          }
                        />
                      </div>

                      {/* UNIT SELECTOR */}
                      <div className="col-span-6 sm:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Unit *
                        </label>
                        <Select
                          value={item.unit}
                          onValueChange={(value) =>
                            handleBatchChange(index, "unit", value)
                          }
                          disabled={item.category === "EQUIPMENT"}
                        >
                          <SelectTrigger
                            className={
                              item.category === "EQUIPMENT"
                                ? "bg-slate-100 text-slate-400"
                                : "bg-white"
                            }
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="pcs">pcs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-12 sm:col-span-4 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Exp. Date
                        </label>
                        <Input
                          type="date"
                          disabled={item.category !== "CHEMICAL"}
                          value={item.expirationDate}
                          onChange={(e) =>
                            handleBatchChange(
                              index,
                              "expirationDate",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-between items-center pt-6 border-t mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBatchRow}
                  className="border-dashed border-2 border-slate-300 text-slate-600 hover:border-slate-400"
                >
                  + Add Another Item
                </Button>

                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-pink-600 hover:bg-pink-700 text-white"
                  >
                    Submit Batch ({batchItems.length})
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* INVENTORY TABLE */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Control No.</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-slate-500"
                >
                  No items in inventory.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-10 w-10 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400 border">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm font-semibold text-pink-600">
                    {item.controlNumber}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full 
                      ${
                        item.category === "CHEMICAL"
                          ? "bg-purple-100 text-purple-700"
                          : item.category === "GLASSWARE"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {item.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span
                      className={
                        item.quantity <= 5 ? "text-red-600" : "text-slate-600"
                      }
                    >
                      {item.quantity} {item.unit}
                    </span>
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
