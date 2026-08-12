import React, { useState, useEffect } from "react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import QRCode from "react-qr-code";
import { Printer, Package } from "lucide-react";
import LogoLoader from "../LogoLoader";

const ManageSpecialRequest = () => {
  const [bundledRequests, setBundledRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // --- Modal States ---
  const [bundleToApprove, setBundleToApprove] = useState(null);
  const [assignedInstances, setAssignedInstances] = useState({});
  const [actionError, setActionError] = useState("");

  const [bundleToReject, setBundleToReject] = useState(null);

  const [bundleToReturn, setBundleToReturn] = useState(null);
  const [returnInstances, setReturnInstances] = useState({});

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/requests/special`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const groupedData = data.reduce((acc, req) => {
        const key = req.bundleId || `legacy-${req.id}`;

        if (!acc[key]) {
          acc[key] = {
            bundleId: key,
            user: req.user,
            reason: req.reason,
            notedBy: req.notedBy, // In case backend returns it natively
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

      const groupedArray = Object.values(groupedData);

      const sorted = groupedArray.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setBundledRequests(sorted);
    } catch (err) {
      toast.error("Failed to load special requests.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingBundles = bundledRequests.filter((b) => b.status === "PENDING");
  const activeBundles = bundledRequests.filter((b) => b.status === "APPROVED");

  // --- REJECT LOGIC ---
  const confirmRejectBundle = async () => {
    if (!bundleToReject) return;
    setActionLoading(bundleToReject.bundleId);

    try {
      await Promise.all(
        bundleToReject.reqIds.map((id) =>
          fetch(`${API_URL}/api/requests/${id}/reject`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to reject an item");
            return res.json();
          }),
        ),
      );

      toast.success("Bundle rejected successfully.");
      fetchRequests();
    } catch (err) {
      toast.error("Failed to reject bundle.");
    } finally {
      setBundleToReject(null);
      setActionLoading(null);
    }
  };

  // --- APPROVE LOGIC ---
  const openApproveModal = (bundle) => {
    setBundleToApprove(bundle);
    setActionError("");

    const initialInstances = {};
    bundle.items.forEach((item) => {
      initialInstances[item.id] = [];
    });
    setAssignedInstances(initialInstances);
  };

  const handleToggleInstance = (item, instanceId) => {
    setAssignedInstances((prev) => {
      const currentSelections = prev[item.id] || [];
      const isChemical = item.inventory?.category === "CHEMICAL";

      if (currentSelections.includes(instanceId)) {
        return {
          ...prev,
          [item.id]: currentSelections.filter((id) => id !== instanceId),
        };
      }

      if (!isChemical && currentSelections.length >= item.amountRequested) {
        return prev;
      }

      return {
        ...prev,
        [item.id]: [...currentSelections, instanceId],
      };
    });
    setActionError("");
  };

  const handleApproveBundleConfirm = async () => {
    const assignmentsPayload = {};
    const controlNumbersMap = {};

    for (const item of bundleToApprove.items) {
      const selected = assignedInstances[item.id] || [];
      const isChemical = item.inventory?.category === "CHEMICAL";

      if (!isChemical && selected.length !== item.amountRequested) {
        setActionError(
          `You must select exactly ${item.amountRequested} control number(s) for ${item.inventory?.name}.`,
        );
        return;
      }
      if (isChemical && selected.length === 0) {
        setActionError(
          `You must select at least one control number (bottle) for ${item.inventory?.name}.`,
        );
        return;
      }

      assignmentsPayload[item.id] = selected;

      controlNumbersMap[item.id] = selected.map((id) => {
        const inst = item.inventory.instances.find((i) => i.id === id);
        return inst ? inst.controlNumber : "";
      });
    }

    setActionLoading(bundleToApprove.bundleId);

    try {
      const response = await fetch(
        `${API_URL}/api/requests/bundle/${bundleToApprove.bundleId}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            assignments: assignmentsPayload,
            controlNumbersMap: controlNumbersMap,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to approve bundle");

      toast.success("Bundle approved successfully.");
      await fetchRequests();

      const updatedBundle =
        bundledRequests.find((b) => b.bundleId === bundleToApprove.bundleId) ||
        bundleToApprove;
      setBundleToApprove(null);
      openPrintPreview(updatedBundle);
    } catch (err) {
      setActionError("Failed to approve request.");
      toast.error("Failed to approve request.");
    } finally {
      setActionLoading(null);
    }
  };

  // --- RETURN LOGIC ---
  const openReturnModal = (bundle) => {
    setBundleToReturn(bundle);
    setReturnInstances({});
    setActionError("");
  };

  const handleReturnToggle = (itemId, instance, condition) => {
    setReturnInstances((prev) => {
      const itemSelections = prev[itemId] || [];
      const exists = itemSelections.find((p) => p.id === instance.id);

      let newSelections;
      if (exists) {
        newSelections =
          exists.condition === condition
            ? itemSelections.filter((p) => p.id !== instance.id)
            : itemSelections.map((p) =>
                p.id === instance.id ? { ...p, condition } : p,
              );
      } else {
        newSelections = [...itemSelections, { id: instance.id, condition }];
      }

      return { ...prev, [itemId]: newSelections };
    });
  };

  const handleProcessReturn = async () => {
    for (const item of bundleToReturn.items) {
      const evaluatedCount = returnInstances[item.id]?.length || 0;
      const requiredCount = item.assignedControlNumbers?.length || 0;

      if (evaluatedCount !== requiredCount) {
        setActionError(
          `You must evaluate all ${requiredCount} items for ${item.inventory?.name}.`,
        );
        return;
      }
    }

    setActionLoading(bundleToReturn.bundleId);

    try {
      await Promise.all(
        bundleToReturn.items.map((item) => {
          const itemReturns = returnInstances[item.id] || [];
          return fetch(`${API_URL}/api/requests/${item.id}/return`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ returnedInstances: itemReturns }),
          }).then((res) => {
            if (!res.ok)
              throw new Error("Failed to process return for an item");
            return res.json();
          });
        }),
      );

      toast.success("Bundle return processed successfully.");
      fetchRequests();
    } catch (err) {
      setActionError("Failed to process return.");
      toast.error("Failed to process return.");
    } finally {
      setBundleToReturn(null);
      setActionLoading(null);
    }
  };

  const openPrintPreview = (bundle) => {
    setSelectedBundle(bundle);
    setIsPrintPreviewOpen(true);
  };

  // Extractor utility for separating reason and notedBy for print
  const getExtractedData = (bundle) => {
    if (!bundle) return { cleanReason: "", notedByText: "" };

    let cleanReason = bundle.reason || "";
    let notedByText = bundle.notedBy || "";

    const match = cleanReason.match(/\(Noted by:\s*(.*?)\)$/i);
    if (match) {
      notedByText = match[1];
      cleanReason = cleanReason.replace(/\(Noted by:\s*(.*?)\)$/i, "").trim();
    }

    return { cleanReason, notedByText };
  };

  if (loading) {
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  return (
    <div className='bg-white p-6 rounded-lg border-2 w-full max-w-7xl mx-auto'>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-slate-900'>
            Special Requests Manager
          </h2>
          <p className='text-muted-foreground mt-1'>
            Review bundled special equipment requests and process returns.
          </p>
        </div>
      </div>

      <Tabs defaultValue='pending' className='w-full'>
        <TabsList className='mb-4 bg-slate-100'>
          <TabsTrigger value='pending' className='font-bold'>
            Pending Requests ({pendingBundles.length})
          </TabsTrigger>
          <TabsTrigger value='active' className='font-bold'>
            Active Borrows ({activeBundles.length})
          </TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value='pending'>
          <div className='rounded-md border'>
            <Table>
              <TableHeader className='bg-slate-50'>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Requested Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBundles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='h-24 text-center text-slate-500'
                    >
                      No pending special requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingBundles.map((bundle) => (
                    <TableRow key={bundle.bundleId}>
                      <TableCell className='font-medium'>
                        {bundle.user?.name}
                        <div className='text-xs text-muted-foreground'>
                          {bundle.user?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-start gap-2'>
                          <Package className='w-4 h-4 mt-0.5 text-slate-400' />
                          <ul className='text-sm space-y-1'>
                            {bundle.items.map((item) => (
                              <li key={item.id}>
                                <span className='font-semibold text-slate-800'>
                                  {item.amountRequested}
                                  {item.inventory?.category === "CHEMICAL"
                                    ? item.inventory?.unit
                                    : "x"}
                                </span>{" "}
                                <span className='text-slate-600'>
                                  {item.inventory?.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TableCell>
                      <TableCell
                        className='max-w-[200px] truncate'
                        title={bundle.reason}
                      >
                        {bundle.reason}
                      </TableCell>
                      <TableCell className='text-sm'>
                        {new Date(bundle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='text-red-600 border-red-200'
                            onClick={() => setBundleToReject(bundle)}
                          >
                            Reject
                          </Button>
                          <Button
                            size='sm'
                            className='bg-green-600 hover:bg-green-700 text-white'
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
        <TabsContent value='active'>
          <div className='rounded-md border'>
            <Table>
              <TableHeader className='bg-amber-50'>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Borrowed Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeBundles.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='h-24 text-center text-slate-500'
                    >
                      No active special borrows.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeBundles.map((bundle) => (
                    <TableRow key={bundle.bundleId}>
                      <TableCell className='font-medium'>
                        {bundle.user?.name}
                        <div className='text-xs text-muted-foreground'>
                          {bundle.user?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex items-start gap-2'>
                          <Package className='w-4 h-4 mt-0.5 text-slate-400' />
                          <ul className='text-sm space-y-1'>
                            {bundle.items.map((item) => (
                              <li key={item.id}>
                                <span className='font-semibold text-slate-800'>
                                  {item.amountRequested}
                                  {item.inventory?.category === "CHEMICAL"
                                    ? item.inventory?.unit
                                    : "x"}
                                </span>{" "}
                                <span className='text-slate-600'>
                                  {item.inventory?.name}
                                </span>
                                {item.assignedControlNumbers?.length > 0 && (
                                  <div className='text-[11px] text-slate-400 font-mono'>
                                    CN: {item.assignedControlNumbers.join(", ")}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TableCell>
                      <TableCell
                        className='max-w-[200px] truncate'
                        title={bundle.reason}
                      >
                        {bundle.reason}
                      </TableCell>
                      <TableCell className='text-sm'>
                        {new Date(bundle.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='text-slate-600'
                            onClick={() => openPrintPreview(bundle)}
                          >
                            <Printer className='w-4 h-4 mr-2' /> Permit
                          </Button>
                          <Button
                            size='sm'
                            className='bg-blue-600 hover:bg-blue-700 text-white'
                            onClick={() => openReturnModal(bundle)}
                          >
                            Process Return
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
      </Tabs>

      {/* REJECT ALERT DIALOG */}
      <AlertDialog
        open={!!bundleToReject}
        onOpenChange={(open) => !open && setBundleToReject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600'>
              Reject Request Bundle
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600'>
              Are you sure you want to reject this entire request bundle? The
              student will be notified and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectBundle}
              className='bg-red-600 hover:bg-red-700 text-white'
              disabled={actionLoading === bundleToReject?.bundleId}
            >
              {actionLoading === bundleToReject?.bundleId
                ? "Processing..."
                : "Yes, Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* APPROVE MODAL */}
      <Dialog
        open={!!bundleToApprove}
        onOpenChange={(open) => !open && setBundleToApprove(null)}
      >
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Approve Bundled Request</DialogTitle>
            <DialogDescription>
              Assign available control numbers or bottles for the items below.
            </DialogDescription>
          </DialogHeader>

          {bundleToApprove && (
            <div className='space-y-4'>
              <div className='bg-slate-50 p-4 rounded border space-y-1'>
                <p className='text-sm'>
                  Student: <b>{bundleToApprove.user?.name}</b>
                </p>
                <p className='text-sm'>
                  Reason: <i>{bundleToApprove.reason}</i>
                </p>
              </div>

              {actionError && (
                <p className='text-red-500 text-sm font-bold bg-red-50 p-2 rounded border border-red-200'>
                  {actionError}
                </p>
              )}

              <ScrollArea className='h-[300px] border rounded-md p-4 bg-white'>
                <div className='space-y-6'>
                  {bundleToApprove.items.map((item) => {
                    const isChemical = item.inventory?.category === "CHEMICAL";

                    const availableInstances =
                      item.inventory?.instances?.filter(
                        (inst) =>
                          inst.condition !== "In Use" &&
                          inst.condition !== "Damaged" &&
                          (isChemical ? inst.quantity > 0 : true),
                      ) || [];

                    return (
                      <div
                        key={item.id}
                        className='border-b pb-4 last:border-0 last:pb-0'
                      >
                        <div className='flex justify-between items-center mb-3'>
                          <span className='font-bold text-slate-800'>
                            {item.inventory?.name}
                          </span>
                          <Badge
                            variant='outline'
                            className='bg-slate-100 text-slate-700'
                          >
                            Needs: {item.amountRequested}{" "}
                            {isChemical ? item.inventory?.unit : "pcs"}
                          </Badge>
                        </div>

                        <div className='grid grid-cols-2 gap-2 mt-2'>
                          {availableInstances.length > 0 ? (
                            availableInstances.map((inst) => (
                              <label
                                key={inst.id}
                                className='flex items-center p-2 border rounded hover:bg-slate-50 cursor-pointer transition-colors'
                              >
                                <input
                                  type='checkbox'
                                  className='mr-3 w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500'
                                  checked={
                                    assignedInstances[item.id]?.includes(
                                      inst.id,
                                    ) || false
                                  }
                                  onChange={() =>
                                    handleToggleInstance(item, inst.id)
                                  }
                                />
                                <div className='flex flex-col'>
                                  <span className='font-mono text-sm leading-tight'>
                                    {inst.controlNumber}
                                  </span>
                                  {isChemical && (
                                    <span className='text-[10px] text-slate-500'>
                                      Contains: {inst.quantity}{" "}
                                      {item.inventory?.unit}
                                    </span>
                                  )}
                                </div>
                              </label>
                            ))
                          ) : (
                            <p className='text-sm text-red-500 col-span-2'>
                              No {isChemical ? "bottles" : "items"} in "Good"
                              condition available.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className='mt-4 border-t pt-4'>
            <Button variant='ghost' onClick={() => setBundleToApprove(null)}>
              Cancel
            </Button>
            <Button
              className='bg-green-600 hover:bg-green-700 text-white'
              onClick={handleApproveBundleConfirm}
              disabled={actionLoading === bundleToApprove?.bundleId}
            >
              {actionLoading === bundleToApprove?.bundleId
                ? "Processing..."
                : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RETURN MODAL */}
      <Dialog
        open={!!bundleToReturn}
        onOpenChange={(open) => !open && setBundleToReturn(null)}
      >
        <DialogContent className='sm:max-w-[650px]'>
          <DialogHeader>
            <DialogTitle className='text-xl text-blue-700'>
              Process Bundle Return
            </DialogTitle>
          </DialogHeader>

          {bundleToReturn && (
            <div className='space-y-4 mt-2'>
              <div className='bg-blue-50 p-4 rounded border border-blue-100'>
                <p className='text-sm text-slate-600'>
                  Receiving from:{" "}
                  <span className='font-bold text-slate-900'>
                    {bundleToReturn.user?.name}
                  </span>
                </p>
              </div>

              {actionError && (
                <p className='text-red-500 text-sm font-bold bg-red-50 p-2 rounded border border-red-200'>
                  {actionError}
                </p>
              )}

              <ScrollArea className='h-[350px] border rounded-md p-4 bg-slate-50'>
                <div className='space-y-6'>
                  {bundleToReturn.items.map((item) => {
                    const isChemical = item.inventory?.category === "CHEMICAL";

                    const assignedInsts =
                      item.inventory?.instances?.filter((inst) =>
                        item.assignedControlNumbers?.includes(
                          inst.controlNumber,
                        ),
                      ) || [];

                    return (
                      <div
                        key={item.id}
                        className='bg-white p-4 rounded border border-slate-200 shadow-sm'
                      >
                        <div className='flex justify-between items-center mb-3'>
                          <span className='font-bold text-slate-800'>
                            {item.inventory?.name}
                          </span>
                          <span className='text-sm text-blue-600 font-bold'>
                            Requested: {item.amountRequested}{" "}
                            {isChemical ? item.inventory?.unit : "pcs"}
                          </span>
                        </div>

                        <div className='space-y-3'>
                          {assignedInsts.length > 0 ? (
                            assignedInsts.map((inst) => {
                              const selectedData = (
                                returnInstances[item.id] || []
                              ).find((r) => r.id === inst.id);
                              const isSelected = !!selectedData;

                              return (
                                <div
                                  key={inst.id}
                                  className={`flex items-center justify-between p-3 rounded border transition-colors ${
                                    isSelected
                                      ? "bg-blue-50/50 border-blue-300"
                                      : "bg-white border-slate-200"
                                  }`}
                                >
                                  <div>
                                    <p className='font-mono font-bold text-sm text-slate-800'>
                                      {inst.controlNumber}
                                    </p>
                                    {isChemical && (
                                      <p className='text-[10px] text-slate-500 italic mt-0.5'>
                                        Note: Returning chemical bottles will
                                        not refill stock volume.
                                      </p>
                                    )}
                                  </div>

                                  <div className='flex gap-2'>
                                    <Button
                                      size='sm'
                                      variant={
                                        selectedData?.condition === "Good"
                                          ? "default"
                                          : "outline"
                                      }
                                      className={
                                        selectedData?.condition === "Good"
                                          ? "bg-green-500 hover:bg-green-600"
                                          : ""
                                      }
                                      onClick={() =>
                                        handleReturnToggle(
                                          item.id,
                                          inst,
                                          "Good",
                                        )
                                      }
                                    >
                                      Good
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant={
                                        selectedData?.condition === "Fair"
                                          ? "default"
                                          : "outline"
                                      }
                                      className={
                                        selectedData?.condition === "Fair"
                                          ? "bg-amber-500 hover:bg-amber-600"
                                          : ""
                                      }
                                      onClick={() =>
                                        handleReturnToggle(
                                          item.id,
                                          inst,
                                          "Fair",
                                        )
                                      }
                                    >
                                      Fair
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant={
                                        selectedData?.condition === "Damaged"
                                          ? "default"
                                          : "outline"
                                      }
                                      className={
                                        selectedData?.condition === "Damaged"
                                          ? "bg-red-500 hover:bg-red-600"
                                          : ""
                                      }
                                      onClick={() =>
                                        handleReturnToggle(
                                          item.id,
                                          inst,
                                          "Damaged",
                                        )
                                      }
                                    >
                                      Damaged
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className='text-sm text-red-500'>
                              Error: Original control numbers not found in
                              inventory.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className='mt-6 border-t pt-4'>
            <Button variant='ghost' onClick={() => setBundleToReturn(null)}>
              Cancel
            </Button>
            <Button
              className='bg-blue-600 hover:bg-blue-700 text-white'
              onClick={handleProcessReturn}
              disabled={actionLoading === bundleToReturn?.bundleId}
            >
              {actionLoading === bundleToReturn?.bundleId
                ? "Processing..."
                : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINT PREVIEW DIALOG */}
      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className='sm:max-w-[600px] print:hidden'>
          <DialogHeader>
            <DialogTitle>Printable Permit Preview</DialogTitle>
            <DialogDescription>
              Ensure your printer is loaded with Short Bond Paper (8.5" x 11").
            </DialogDescription>
          </DialogHeader>

          <div className='border rounded-md bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-4'>
            <Printer className='w-12 h-12 text-slate-400' />
            <p className='text-sm text-slate-600'>
              Clicking print will trigger the browser's print dialog. Only the
              split agreement and permit will be printed.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsPrintPreviewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => window.print()}
              className='bg-slate-900 hover:bg-slate-800 text-white'
            >
              <Printer className='w-4 h-4 mr-2' /> Print Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINT LAYOUT */}
      {selectedBundle &&
        (() => {
          const { cleanReason, notedByText } = getExtractedData(selectedBundle);

          return (
            <div className='hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999]'>
              {/* TOP HALF: OFFICIAL PERMIT */}
              <div className='h-[5.5in] w-[8.5in] p-8 flex flex-col items-center justify-center relative'>
                <h1 className='text-3xl font-black uppercase tracking-widest border-2 border-black px-6 py-2 rounded-md mb-8'>
                  Official Lab Permit
                </h1>

                <div className='flex items-center gap-10 w-full max-w-3xl border-2 border-gray-200 rounded-xl p-8 bg-gray-50/50'>
                  <div className='flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm'>
                    <QRCode
                      value={JSON.stringify({
                        bundleId: selectedBundle.bundleId,
                        studentId: selectedBundle.user?.id,
                        type: "SPECIAL_REQUEST_BUNDLE",
                        items: selectedBundle.items.map((item) => ({
                          name: item.inventory?.name,
                          qty: item.amountRequested,
                          controlNumbers: item.assignedControlNumbers || [],
                        })),
                      })}
                      size={140}
                      level='H'
                    />
                    <span className='mt-2 text-[10px] font-mono text-gray-500 font-semibold tracking-widest'>
                      SCAN TO VERIFY
                    </span>
                  </div>

                  <div className='flex-1 space-y-4 min-w-0'>
                    <div>
                      <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-1'>
                        Issued To
                      </p>
                      <p className='text-xl font-bold text-black'>
                        {selectedBundle.user?.name}
                      </p>
                    </div>

                    <div>
                      <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-1'>
                        Approved Materials
                      </p>
                      <div className='grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-md font-semibold text-black leading-tight'>
                        {selectedBundle.items.map((item) => (
                          <div key={item.id}>
                            <div>
                              {item.amountRequested}x {item.inventory?.name}
                            </div>
                            {item.assignedControlNumbers?.length > 0 && (
                              <div className='text-xs text-gray-500 font-normal font-mono'>
                                CN: {item.assignedControlNumbers.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className='grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 mt-4'>
                      <div>
                        <p className='text-[10px] text-gray-500 font-bold uppercase'>
                          Date Issued
                        </p>
                        <p className='text-sm font-semibold'>
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <div className='min-w-0'>
                        <p className='text-[10px] text-gray-500 font-bold uppercase'>
                          Noted By
                        </p>
                        <p
                          className='text-sm font-semibold truncate'
                          title={notedByText || "N/A"}
                        >
                          {notedByText || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className='text-[10px] text-gray-500 font-bold uppercase'>
                          Status
                        </p>
                        <p className='text-sm font-bold text-green-600 uppercase tracking-widest'>
                          VALIDATED
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM HALF: EQUIPMENT BORROWING AGREEMENT */}
              <div className='h-[5.5in] w-[8.5in] border-t-2 border-dotted border-gray-400 p-8 flex flex-col justify-between relative'>
                <div className='absolute top-0 left-0 w-full flex justify-center items-center -mt-[10px]'>
                  <span className='bg-white px-4 text-xs text-gray-500 font-mono tracking-widest flex items-center gap-2 z-10'>
                    ✂ CUT ALONG THE DOTTED LINE
                  </span>
                </div>

                <div>
                  <div className='flex justify-between items-start mb-6'>
                    <div>
                      <h2 className='text-2xl font-bold uppercase tracking-tight'>
                        Equipment Borrowing Agreement
                      </h2>
                      <p className='text-sm text-gray-500 font-medium'>
                        Donsol National Comprehensive High School{" "}
                      </p>
                    </div>
                    <div className='text-right text-sm font-semibold'>
                      Date: {new Date().toLocaleDateString()}
                      <br />
                      Ref: BNDL-
                      {selectedBundle.bundleId.toString().substring(0, 8)}
                    </div>
                  </div>

                  <div className='space-y-4 text-sm text-justify leading-relaxed'>
                    <p>
                      I, <strong>{selectedBundle.user?.name}</strong>, formally
                      acknowledge the receipt of the following laboratory
                      equipment/materials:
                    </p>

                    <ul className='grid grid-cols-2 gap-x-8 gap-y-2 list-disc ml-6 font-semibold text-sm'>
                      {selectedBundle.items.map((item) => (
                        <li key={item.id} className='pl-1'>
                          <div>
                            {item.amountRequested}{" "}
                            {item.inventory?.category === "CHEMICAL"
                              ? item.inventory?.unit
                              : "pcs"}{" "}
                            - {item.inventory?.name}
                          </div>
                          {item.assignedControlNumbers?.length > 0 && (
                            <div className='text-xs text-gray-500 font-normal font-mono mt-0.5'>
                              CN: {item.assignedControlNumbers.join(", ")}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    <p>
                      <strong>Stated Purpose:</strong> {cleanReason}
                    </p>
                    <p>
                      By signing this agreement, I assume full responsibility
                      for the care, proper usage, and timely return of the
                      aforementioned items. I understand that any damage, loss,
                      or failure to return the items will result in a hold on my
                      clearance and liability for replacement costs.
                    </p>
                  </div>
                </div>

                <div className='grid grid-cols-3 gap-6 mt-8 text-center pt-8'>
                  <div>
                    <div className='border-b border-black mb-1 mx-2'></div>
                    <p className='text-xs font-semibold uppercase truncate px-1'>
                      {selectedBundle.user?.name}
                    </p>
                    <p className='text-xs text-gray-500'>Student Signature</p>
                  </div>
                  <div>
                    <div className='border-b border-black mb-1 mx-2'></div>
                    <p className='text-xs font-semibold uppercase truncate px-1'>
                      {notedByText || "Subject Teacher"}
                    </p>
                    <p className='text-xs text-gray-500'>Noted By (Teacher)</p>
                  </div>
                  <div>
                    <div className='border-b border-black mb-1 mx-2'></div>
                    <p className='text-xs font-semibold uppercase px-1'>
                      Admin / Lab Custodian
                    </p>
                    <p className='text-xs text-gray-500'>
                      Authorized Signature
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; margin: 0; padding: 0; }
          @page { size: letter portrait; margin: 0; }
        }
      `,
        }}
      />
    </div>
  );
};

export default ManageSpecialRequest;