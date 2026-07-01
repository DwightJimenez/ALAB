import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ManageRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Modals State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignedInstances, setAssignedInstances] = useState([]);
  const [actionError, setActionError] = useState("");

  const [returnRequest, setReturnRequest] = useState(null);
  const [returnInstances, setReturnInstances] = useState([]); // [{ id, condition }]

  const fetchRequests = async () => {
    try {
      const [pendingRes, activeRes] = await Promise.all([
        fetch("http://localhost:5000/api/requests/pending", { credentials: "include" }),
        fetch("http://localhost:5000/api/requests/active", { credentials: "include" })
      ]);

      const pendingData = await pendingRes.json();
      const activeData = await activeRes.json();

      setPendingRequests(pendingData);
      setActiveRequests(activeData);
    } catch (err) {
      setError("Could not load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- APPROVAL LOGIC ---
  const openApproveModal = (req) => {
    setSelectedRequest(req);
    setAssignedInstances([]);
    setActionError("");
  };

  const handleToggleInstance = (instanceId) => {
    setAssignedInstances(prev => {
      if (prev.includes(instanceId)) return prev.filter(id => id !== instanceId);
      if (prev.length >= selectedRequest.amountRequested) return prev;
      return [...prev, instanceId];
    });
  };

  const handleApprove = async () => {
    const isIndividual = selectedRequest.inventory.category !== "CHEMICAL";
    if (isIndividual && assignedInstances.length !== selectedRequest.amountRequested) {
      setActionError(`You must select exactly ${selectedRequest.amountRequested} control number(s).`);
      return;
    }

    try {
      await fetch(`http://localhost:5000/api/requests/${selectedRequest.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignedInstanceIds: assignedInstances }),
      });
      setSelectedRequest(null);
      fetchRequests(); 
    } catch (err) {
      setActionError("Failed to approve request.");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this request?")) return;
    try {
      await fetch(`http://localhost:5000/api/requests/${id}/reject`, { method: "PUT", credentials: "include" });
      fetchRequests(); 
    } catch (err) {
      alert("Failed to reject request.");
    }
  };

  // --- RETURN LOGIC ---
  const openReturnModal = (req) => {
    setReturnRequest(req);
    setReturnInstances([]);
    setActionError("");
  };

  const handleReturnToggle = (instance, condition) => {
    setReturnInstances(prev => {
      const exists = prev.find(p => p.id === instance.id);
      if (exists) {
        // If clicking same condition, remove it. Otherwise update condition.
        return exists.condition === condition 
          ? prev.filter(p => p.id !== instance.id) 
          : prev.map(p => p.id === instance.id ? { ...p, condition } : p);
      }
      if (prev.length >= returnRequest.amountRequested) return prev;
      return [...prev, { id: instance.id, condition }];
    });
  };

  const handleProcessReturn = async () => {
    const isIndividual = returnRequest.inventory.category !== "CHEMICAL";
    if (isIndividual && returnInstances.length !== returnRequest.amountRequested) {
      setActionError(`You must evaluate exactly ${returnRequest.amountRequested} item(s) to process the return.`);
      return;
    }

    try {
      await fetch(`http://localhost:5000/api/requests/${returnRequest.id}/return`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ returnedInstances: returnInstances }),
      });
      setReturnRequest(null);
      fetchRequests(); 
    } catch (err) {
      setActionError("Failed to process return.");
    }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading requests...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="bg-white p-6 m-5 rounded-lg border-2 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Request Manager</h2>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4 bg-slate-100">
          <TabsTrigger value="pending" className="font-bold">Pending Requests ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="active" className="font-bold">Active Borrows ({activeRequests.length})</TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Requested Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">No pending requests.</TableCell></TableRow>
                ) : (
                  pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <p className="font-bold text-slate-800">{req.student?.name}</p>
                        <p className="text-xs text-slate-500">{req.student?.email}</p>
                      </TableCell>
                      <TableCell className="font-medium">{req.inventory?.name}</TableCell>
                      <TableCell className="text-center font-bold text-pink-600">{req.amountRequested} {req.inventory?.unit}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleReject(req.id)}>Reject</Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openApproveModal(req)}>Approve</Button>
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
                  <TableHead>Borrowed Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRequests.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">No active borrow records.</TableCell></TableRow>
                ) : (
                  activeRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <p className="font-bold text-slate-800">{req.student?.name}</p>
                        <p className="text-xs text-slate-500">{req.student?.email}</p>
                      </TableCell>
                      <TableCell className="font-medium">{req.inventory?.name}</TableCell>
                      <TableCell className="text-center font-bold text-amber-600">{req.amountRequested} {req.inventory?.unit}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openReturnModal(req)}>
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

      {/* APPROVE MODAL (Unchanged from previous iteration) */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Approve Request</DialogTitle></DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded border">
                <p className="text-sm">Student: <b>{selectedRequest.student?.name}</b></p>
                <p className="text-sm">Item: <b>{selectedRequest.inventory?.name}</b> ({selectedRequest.amountRequested} {selectedRequest.inventory?.unit})</p>
              </div>
              {actionError && <p className="text-red-500 text-sm font-bold">{actionError}</p>}
              {selectedRequest.inventory?.category !== "CHEMICAL" && (
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">Select {selectedRequest.amountRequested} Control Number(s):</label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <div className="space-y-2">
                      {selectedRequest.inventory?.instances?.map(inst => (
                        <label key={inst.id} className="flex items-center p-2 border rounded hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" className="mr-3" checked={assignedInstances.includes(inst.id)} onChange={() => handleToggleInstance(inst.id)} />
                          <span className="font-mono text-sm">{inst.controlNumber}</span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button className="bg-green-600 text-white" onClick={handleApprove}>Confirm Approval</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RETURN MODAL */}
      <Dialog open={!!returnRequest} onOpenChange={(open) => !open && setReturnRequest(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl text-blue-700">Process Item Return</DialogTitle>
          </DialogHeader>
          
          {returnRequest && (
            <div className="space-y-4 mt-2">
              <div className="bg-blue-50 p-4 rounded border border-blue-100">
                <p className="text-sm text-slate-600">Receiving from: <span className="font-bold text-slate-900">{returnRequest.student?.name}</span></p>
                <p className="text-sm text-slate-600">Item: <span className="font-bold text-slate-900">{returnRequest.inventory?.name}</span></p>
                <p className="text-sm text-slate-600">Quantity to Return: <span className="font-bold text-blue-600">{returnRequest.amountRequested} {returnRequest.inventory?.unit}</span></p>
              </div>

              {actionError && <p className="text-red-500 text-sm font-bold">{actionError}</p>}

              {returnRequest.inventory?.category !== "CHEMICAL" ? (
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-2">
                    Inspect physical items and log their return condition:
                  </label>
                  <ScrollArea className="h-[250px] border rounded-md p-2 bg-slate-50">
                    <div className="space-y-3">
                      {returnRequest.inventory?.instances?.length > 0 ? (
                        returnRequest.inventory.instances.map(inst => {
                          const selectedData = returnInstances.find(r => r.id === inst.id);
                          const isSelected = !!selectedData;
                          
                          return (
                            <div key={inst.id} className={`flex items-center justify-between p-3 rounded border transition-colors ${isSelected ? "bg-white border-blue-400 shadow-sm" : "bg-white border-slate-200"}`}>
                              <div>
                                <p className="font-mono font-bold text-sm text-slate-800">{inst.controlNumber}</p>
                                <p className="text-xs text-slate-500">Currently: In Use</p>
                              </div>

                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant={selectedData?.condition === "Good" ? "default" : "outline"}
                                  className={selectedData?.condition === "Good" ? "bg-green-500 hover:bg-green-600" : ""}
                                  onClick={() => handleReturnToggle(inst, "Good")}
                                >
                                  Good
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={selectedData?.condition === "Fair" ? "default" : "outline"}
                                  className={selectedData?.condition === "Fair" ? "bg-amber-500 hover:bg-amber-600" : ""}
                                  onClick={() => handleReturnToggle(inst, "Fair")}
                                >
                                  Fair
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={selectedData?.condition === "Damaged" ? "default" : "outline"}
                                  className={selectedData?.condition === "Damaged" ? "bg-red-500 hover:bg-red-600" : ""}
                                  onClick={() => handleReturnToggle(inst, "Damaged")}
                                >
                                  Damaged
                                </Button>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-red-500 p-2">No items found in "In Use" state.</p>
                      )}
                    </div>
                  </ScrollArea>
                  <p className="text-xs font-bold text-slate-500 mt-2 text-right">
                    Processed: {returnInstances.length} / {returnRequest.amountRequested}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 italic">
                  Chemicals are assumed consumed. Processing return will archive this request but will <b>not</b> add the volume back to stock.
                </p>
              )}
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setReturnRequest(null)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleProcessReturn}>
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageRequests;