import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL;

export default function AssignExperimentModal({
  isOpen,
  onClose,
  experimentId,
  availableSections,
  requireSafetyGate,
  initialSections = [],
  initialDueDate = "",
  onAssignSuccess
}) {
  const [sections, setSections] = useState(initialSections);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [isSectionsDropdownOpen, setIsSectionsDropdownOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const toggleSection = (sectionName) => {
    setSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((s) => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  const handleAssign = async () => {
    if (!experimentId) {
      toast.error("Please save the experiment template first.");
      return;
    }
    
    if (sections.length === 0) {
      toast.error("Please select at least one section.");
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch(`${API_URL}/api/experiments/${experimentId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          yearAndSections: sections,
          dueDate: dueDate || null,
          requireSafetyGate: requireSafetyGate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign experiment.");
      }

      toast.success("Experiment assigned successfully!");
      if (onAssignSuccess) onAssignSuccess(sections, dueDate);
      onClose();
    } catch (error) {
      console.error("Assign error:", error);
      toast.error(error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Assign Experiment</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          {/* Target Sections */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs uppercase text-slate-500 font-bold flex justify-between">
              Target Sections
              <span className="text-indigo-600 lowercase font-medium">
                {sections.length} selected
              </span>
            </Label>

            <Popover open={isSectionsDropdownOpen} onOpenChange={setIsSectionsDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm font-normal"
                >
                  <span className="truncate pr-2">
                    {sections.length > 0 ? sections.join(", ") : "Select sections..."}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-2" align="start">
                <div className="max-h-40 overflow-y-auto">
                  {availableSections.length > 0 ? (
                    availableSections.map((sectionName, index) => (
                      <label
                        key={index}
                        className="flex items-center space-x-2 p-2 hover:bg-slate-50 cursor-pointer rounded"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={sections.includes(sectionName)}
                          onChange={() => toggleSection(sectionName)}
                        />
                        <span className="text-sm font-medium">{sectionName}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground p-2">Loading...</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs uppercase text-slate-500 font-bold">Target Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-10 text-sm bg-white"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={isAssigning}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
          >
            {isAssigning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assigning...</> : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}