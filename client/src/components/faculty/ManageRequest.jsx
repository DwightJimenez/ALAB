import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Package } from "lucide-react";

const ManageRequests = () => {
  const [pendingBundles, setPendingBundles] = useState([]);
  const [activeBundles, setActiveBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  // Modals State
  const [bundleToApprove, setBundleToApprove] = useState(null);
  const [assignedInstances, setAssignedInstances] = useState({});
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [bundleToReturn, setBundleToReturn] = useState(null);
  const [returnInstances, setReturnInstances] = useState({}); 

  // Reject Alert Dialog State
  const [bundleToReject, setBundleToReject] = useState(null);

  const fetchRequests = async () => {
    try {
      const [pendingRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/requests/pending`, { credentials: "include" }),
        fetch(`${API_URL}/api/requests/active`, { credentials: "include" }),
      ]);

      const pendingData = await pendingRes.json();
      const activeData = await activeRes.json();

      // Grouping function based on bundleId
      const groupIntoBundles = (data) => {
        const grouped = data.reduce((acc, req) => {
          const key = req.bundleId || `legacy-${req.id}`;
          if (!acc[key]) {
            acc[key] = {
              bundleId: key,
              student: req.student || req.user, // Handle populated alias
              createdAt: req.createdAt,
              status: req.status,
              items: [],
              reqIds: [],
            };
          }
          acc[key].items.push({
            id: req.id,
            inventory: req.inventory,
            amountRequested: req.amountRequested,
            assignedControlNumbers: req.assignedControlNumbers || [],
          });
          acc[key].reqIds.push(req.id);
          return acc;
        }, {});
        return Object.values(grouped).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      };

      setPendingBundles(groupIntoBundles(pendingData));
      setActiveBundles(groupIntoBundles(activeData));
    } catch (err) {
      setError("Could not load requests.");
      toast.error("Failed to fetch requests from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- APPROVAL LOGIC ---
  const openApproveModal = (bundle) => {
    setBundleToApprove(bundle);
    setActionError("");
    
    // Initialize instance selections for each item in the bundle
    const initialInstances = {};
    bundle.items.forEach(item => {
      initialInstances[item.id] = [];
    });
    setAssignedInstances(initialInstances);
  };

  const handleToggleInstance = (itemId, instanceId, amountRequested) => {
    setAssignedInstances((prev) => {
      const currentSelections = prev[itemId] || [];
      if (currentSelections.includes(instanceId)) {
        return { ...prev, [itemId]: currentSelections.filter(id => id !== instanceId) };
      }
      if (currentSelections.length >= amountRequested) return prev;
      
      return { ...prev, [itemId]: [...currentSelections, instanceId] };
    });
  };

  const handleApprove = async () => {
    // Validate all items in the bundle before hitting the API
    for (const item of bundleToApprove.items) {
      const isChemical = item.inventory?.category === "CHEMICAL";
      const selectedCount = (assignedInstances[item.id] || []).length;
      
      if (!isChemical && selectedCount !== item.amountRequested) {
        setActionError(`You must select exactly ${item.amountRequested} control number(s) for ${item.inventory?.name}.`);
        return;
      }
    }

    setActionLoading(true);
    try {
      // Approve all items in the bundle simultaneously using individual endpoints
      await Promise.all(
        bundleToApprove.items.map(async (item) => {
          const selectedIds = assignedInstances[item.id] || [];
          
          // Map IDs to control numbers in case backend needs it (safety fallback)
          const controlNumbers = selectedIds.map(id => {
            const inst = item.inventory.instances.find(i => i.id === id);
            return inst ? inst.controlNumber : "";
          });

          const response = await fetch(`${API_URL}/api/requests/${item.id}/approve`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
              assignedInstanceIds: selectedIds,
              assignedControlNumbers: controlNumbers // Passed just in case
            }),
          });
          if (!response.ok) throw new Error(`Failed to approve item ${item.id}`);
          return response.json();
        })
      );

      toast.success("Request bundle approved successfully.");
      setBundleToApprove(null);
      fetchRequests();
    } catch (err) {
      setActionError("Failed to approve bundle.");
      toast.error("Failed to approve bundle.");
    } finally {
      setActionLoading(false);
    }
  };

  // --- REJECT LOGIC ---
  const confirmReject = async () => {
    if (!bundleToReject) return;
    setActionLoading(true);
    try {
      // Reject all items in the bundle simultaneously
      await Promise.all(
        bundleToReject.reqIds.map(async (id) => {
          const response = await fetch(`${API_URL}/api/requests/${id}/reject`, {
            method: "PUT",
            credentials: "include",
          });
          if (!response.ok) throw new Error("Failed to reject");
          return response.json();
        })
      );

      toast.success("Request bundle rejected.");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to reject request bundle.");
    } finally {
      setBundleToReject(null);
      setActionLoading(false);
    }
  };

  // --- RETURN LOGIC ---
  const openReturnModal = (bundle) => {
    setBundleToReturn(bundle);
    setReturnInstances({});
    setActionError("");
  };

  const handleReturnToggle = (itemId, instance, condition, amountRequested) => {
    setReturnInstances((prev) => {
      const itemSelections = prev[itemId] || [];
      const exists = itemSelections.find((p) => p.id === instance.id);
      
      let newSelections;
      if (exists) {
        newSelections = exists.condition === condition
          ? itemSelections.filter((p) => p.id !== instance.id)
          : itemSelections.map((p) => (p.id === instance.id ? { ...p, condition } : p));
      } else {
        if (itemSelections.length >= amountRequested) return prev;
        newSelections = [...itemSelections, { id: instance.id, condition }];
      }

      return { ...prev, [itemId]: newSelections };
    });
  };

  const handleProcessReturn = async () => {
    // Validate all items in the bundle before submitting
    for (const item of bundleToReturn.items) {
      const isChemical = item.inventory?.category === "CHEMICAL";
      const evaluatedCount = (returnInstances[item.id] || []).length;
      
      if (!isChemical && evaluatedCount !== item.amountRequested) {
        setActionError(`You must evaluate exactly ${item.amountRequested} item(s) for ${item.inventory?.name}.`);
        return;
      }
    }

    setActionLoading(true);
    try {
      // Process return for all items in the bundle simultaneously
      await Promise.all(
        bundleToReturn.items.map(async (item) => {
          const itemReturns = returnInstances[item.id] || [];
          const response = await fetch(`${API_URL}/api/requests/${item.id}/return`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ returnedInstances: itemReturns }),
          });
          if (!response.ok) throw new Error("Failed to process return");
          return response.json();
        })
      );

      toast.success("Item returns processed successfully.");
      setBundleToReturn(null);
      fetchRequests();
    } catch (err) {
      setActionError("Failed to process return.");
      toast.error("Failed to process return.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading requests...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="bg-white p-6 rounded-lg border-2 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Request Manager
        </h2>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="pending" className="font-bold">
            Requests ({pendingBundles.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="font-bold">
            Borrows ({activeBundles.length})
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Requested Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBundles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                      No pending requests for your assigned classes.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingBundles.map((bundle) => (
                    <TableRow key={bundle.bundleId}>
                      <TableCell>
                        <p className="font-bold text-slate-800">
                          {bundle.student?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {bundle.student?.year} - {bundle.student?.section}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 mt-0.5 text-slate-400" />
                          <ul className="text-sm space-y-1">
                            {bundle.items.map(item => (
                              <li key={item.id}>
                                <span className="font-bold text-pink-600">
                                  {item.amountRequested} {item.inventory?.category === "CHEMICAL" ? item.inventory?.unit : "x"}
                                </span>{" "}
                                <span className="font-medium text-slate-700">
                                  {item.inventory?.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(bundle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setBundleToReject(bundle)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openApproveModal(bundle)}
                          >
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ACTIVE BORROWS TAB */}
        <TabsContent value="active">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-amber-50">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Borrowed Items</TableHead>
                  <TableHead>Date Approved</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBundles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                      No active borrow records for your assigned classes.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeBundles.map((bundle) => (
                    <TableRow key={bundle.bundleId}>
                      <TableCell>
                        <p className="font-bold text-slate-800">
                          {bundle.student?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {bundle.student?.year} - {bundle.student?.section}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Package className="w-4 h-4 mt-0.5 text-slate-400" />
                          <ul className="text-sm space-y-1">
                            {bundle.items.map(item => (
                              <li key={item.id}>
                                <span className="font-bold text-amber-600">
                                  {item.amountRequested} {item.inventory?.category === "CHEMICAL" ? item.inventory?.unit : "x"}
                                </span>{" "}
                                <span className="font-medium text-slate-700">
                                  {item.inventory?.name}
                                </span>
                                {item.assignedControlNumbers?.length > 0 && (
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    CN: {item.assignedControlNumbers.join(", ")}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(bundle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openReturnModal(bundle)}
                        >
                          Process Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* APPROVE MODAL */}
      <Dialog
        open={!!bundleToApprove}
        onOpenChange={(open) => !open && setBundleToApprove(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Bundle Request</DialogTitle>
            <DialogDescription>
              Select control numbers for equipment to approve this request.
            </DialogDescription>
          </DialogHeader>

          {bundleToApprove && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded border space-y-1">
                <p className="text-sm">
                  Student: <b>{bundleToApprove.student?.name}</b> ({bundleToApprove.student?.year} - {bundleToApprove.student?.section})
                </p>
              </div>

              {actionError && (
                <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded border border-red-200">
                  {actionError}
                </p>
              )}

              <ScrollArea className="h-[300px] border rounded-md p-4 bg-white">
                <div className="space-y-6">
                  {bundleToApprove.items.map((item) => {
                    const isChemical = item.inventory?.category === "CHEMICAL";
                    
                    return (
                      <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800">
                            {item.inventory?.name}
                          </span>
                          <Badge variant="outline" className="bg-slate-100 text-slate-700">
                            Needs: {item.amountRequested} {isChemical ? item.inventory?.unit : "pcs"}
                          </Badge>
                        </div>

                        {!isChemical ? (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {item.inventory?.instances?.length > 0 ? (
                              item.inventory.instances.map((inst) => (
                                <label
                                  key={inst.id}
                                  className="flex items-center p-2 border rounded hover:bg-slate-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="mr-3 text-green-600 rounded focus:ring-green-500"
                                    checked={(assignedInstances[item.id] || []).includes(inst.id)}
                                    onChange={() => handleToggleInstance(item.id, inst.id, item.amountRequested)}
                                  />
                                  <span className="font-mono text-sm">
                                    {inst.controlNumber}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <p className="text-sm text-red-500 col-span-2">
                                No items in "Good" condition available.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic">
                            Chemicals do not require control number assignments. They will be auto-deducted.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setBundleToApprove(null)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RETURN MODAL */}
      <Dialog
        open={!!bundleToReturn}
        onOpenChange={(open) => !open && setBundleToReturn(null)}
      >
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-700">
              Process Bundle Return
            </DialogTitle>
          </DialogHeader>

          {bundleToReturn && (
            <div className="space-y-4 mt-2">
              <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <p className="text-sm text-slate-600">
                  Receiving from:{" "}
                  <span className="font-bold text-slate-900">
                    {bundleToReturn.student?.name}
                  </span>
                </p>
              </div>

              {actionError && (
                <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded border border-red-200">
                  {actionError}
                </p>
              )}

              <ScrollArea className="h-[350px] border rounded-md p-4 bg-slate-50">
                <div className="space-y-6">
                  {bundleToReturn.items.map((item) => {
                    const isChemical = item.inventory?.category === "CHEMICAL";

                    return (
                      <div key={item.id} className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-800">
                            {item.inventory?.name}
                          </span>
                          <span className="text-sm text-blue-600 font-bold">
                            Return Qty: {item.amountRequested} {isChemical ? item.inventory?.unit : "pcs"}
                          </span>
                        </div>

                        {!isChemical ? (
                          <div className="space-y-3">
                            {item.inventory?.instances?.filter(inst => item.assignedControlNumbers?.includes(inst.controlNumber)).length > 0 ? (
                              item.inventory.instances
                                .filter(inst => item.assignedControlNumbers?.includes(inst.controlNumber))
                                .map((inst) => {
                                  const selectedData = (returnInstances[item.id] || []).find(r => r.id === inst.id);
                                  const isSelected = !!selectedData;

                                  return (
                                    <div
                                      key={inst.id}
                                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded border transition-colors gap-2 ${isSelected ? "bg-white border-blue-400 shadow-sm" : "bg-white border-slate-200"}`}
                                    >
                                      <div>
                                        <p className="font-mono font-bold text-sm text-slate-800">
                                          {inst.controlNumber}
                                        </p>
                                        <p className="text-xs text-slate-500">Currently: In Use</p>
                                      </div>

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={selectedData?.condition === "Good" ? "default" : "outline"}
                                          className={selectedData?.condition === "Good" ? "bg-green-500 hover:bg-green-600" : ""}
                                          onClick={() => handleReturnToggle(item.id, inst, "Good", item.amountRequested)}
                                        >
                                          Good
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={selectedData?.condition === "Fair" ? "default" : "outline"}
                                          className={selectedData?.condition === "Fair" ? "bg-amber-500 hover:bg-amber-600" : ""}
                                          onClick={() => handleReturnToggle(item.id, inst, "Fair", item.amountRequested)}
                                        >
                                          Fair
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={selectedData?.condition === "Damaged" ? "default" : "outline"}
                                          className={selectedData?.condition === "Damaged" ? "bg-red-500 hover:bg-red-600" : ""}
                                          onClick={() => handleReturnToggle(item.id, inst, "Damaged", item.amountRequested)}
                                        >
                                          Damaged
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })
                            ) : (
                              <p className="text-sm text-red-500 p-2">
                                No assigned control numbers found for this return.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 italic">
                            Chemicals are assumed consumed and do not need condition evaluations.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setBundleToReturn(null)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleProcessReturn}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT ALERT DIALOG */}
      <AlertDialog
        open={!!bundleToReject}
        onOpenChange={(open) => !open && setBundleToReject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Reject Request Bundle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to reject this bundle? The student will be
              notified and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Yes, Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageRequests;