import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import QRCode from "react-qr-code";
import {
  CheckCircle,
  XCircle,
  Printer,
  Eye,
  Clock,
  Ban,
  MoreHorizontal,
  Package,
} from "lucide-react";
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
          assignedControlNumbers: req.assignedControlNumbers || [], // <-- Grab saved CNs from DB
        });
        acc[key].reqIds.push(req.id);

        return acc;
      }, {});

      const groupedArray = Object.values(groupedData);

      const sorted = groupedArray.sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (a.status !== "PENDING" && b.status === "PENDING") return 1;
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

  const openApproveModal = (bundle) => {
    setBundleToApprove(bundle);
    setActionError("");

    const initialInstances = {};
    bundle.items.forEach((item) => {
      if (item.inventory?.category !== "CHEMICAL") {
        initialInstances[item.id] = [];
      }
    });
    setAssignedInstances(initialInstances);
  };

  const handleToggleInstance = (itemId, instanceId, amountRequested) => {
    setAssignedInstances((prev) => {
      const currentSelections = prev[itemId] || [];

      if (currentSelections.includes(instanceId)) {
        return {
          ...prev,
          [itemId]: currentSelections.filter((id) => id !== instanceId),
        };
      }

      if (currentSelections.length >= amountRequested) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: [...currentSelections, instanceId],
      };
    });
    setActionError("");
  };

  const handleApproveBundleConfirm = async () => {
    const assignmentsPayload = {};
    const controlNumbersMap = {};

    for (const item of bundleToApprove.items) {
      if (item.inventory?.category !== "CHEMICAL") {
        const selected = assignedInstances[item.id] || [];
        if (selected.length !== item.amountRequested) {
          setActionError(
            `You must select exactly ${item.amountRequested} control number(s) for ${item.inventory?.name}.`,
          );
          return;
        }
        assignmentsPayload[item.id] = selected;

        // Map selected instance IDs to control number strings for DB and Print
        controlNumbersMap[item.id] = selected.map((id) => {
          const inst = item.inventory.instances.find((i) => i.id === id);
          return inst ? inst.controlNumber : "";
        });
      } else {
        assignmentsPayload[item.id] = [];
        controlNumbersMap[item.id] = [];
      }
    }

    setActionLoading(bundleToApprove.bundleId);

    try {
      // Hit your new unified bundle approve route
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

      // Refresh data to grab the newly saved items and control numbers from the server
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

  const openPrintPreview = (bundle) => {
    setSelectedBundle(bundle);
    setIsPrintPreviewOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className='bg-amber-100 text-amber-800'>
            <Clock size={12} className='mr-1' /> Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className='bg-green-100 text-green-800'>
            <CheckCircle size={12} className='mr-1' /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className='bg-red-100 text-red-800'>
            <XCircle size={12} className='mr-1' /> Rejected
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className='bg-slate-100 text-slate-600'>
            <Ban size={12} className='mr-1' /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className='flex h-[50vh] items-center justify-center'>
        <LogoLoader size='sm' />
      </div>
    );
  }

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <div className='flex justify-between items-end'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-navy'>
            Special Requests Management
          </h1>
          <p className='text-muted-foreground mt-1'>
            Review bundled special equipment requests and assign control
            numbers.
          </p>
        </div>
      </div>

      <Card className='shadow-sm'>
        <Table>
          <TableHeader className='bg-slate-50'>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Requested Items</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundledRequests.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center text-slate-500 py-10'
                >
                  No special requests found.
                </TableCell>
              </TableRow>
            ) : (
              bundledRequests.map((bundle) => (
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
                              {item.amountRequested}x
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

                  <TableCell>{getStatusBadge(bundle.status)}</TableCell>

                  <TableCell className='text-right'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' className='h-8 w-8 p-0'>
                          <span className='sr-only'>Open menu</span>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end' className='w-[160px]'>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>

                        <DropdownMenuItem className='cursor-pointer'>
                          <Eye className='mr-2 h-4 w-4 text-slate-500' />
                          View Details
                        </DropdownMenuItem>

                        {bundle.status === "PENDING" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='cursor-pointer text-green-600 focus:text-green-700 focus:bg-green-50 font-medium'
                              disabled={actionLoading === bundle.bundleId}
                              onClick={() => openApproveModal(bundle)}
                            >
                              <CheckCircle className='mr-2 h-4 w-4' />
                              Approve All
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 font-medium'
                              disabled={actionLoading === bundle.bundleId}
                              onClick={() => setBundleToReject(bundle)}
                            >
                              <XCircle className='mr-2 h-4 w-4' />
                              Reject All
                            </DropdownMenuItem>
                          </>
                        )}

                        {bundle.status === "APPROVED" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='cursor-pointer focus:bg-slate-100 font-medium'
                              onClick={() => openPrintPreview(bundle)}
                            >
                              <Printer className='mr-2 h-4 w-4 text-slate-600' />
                              Print Permit
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

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

      {/* APPROVE MODAL W/ CHECKBOXES */}
      <Dialog
        open={!!bundleToApprove}
        onOpenChange={(open) => !open && setBundleToApprove(null)}
      >
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Approve Bundled Request</DialogTitle>
            <DialogDescription>
              Assign available control numbers for the items below.
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
                  {bundleToApprove.items.map((item) => (
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
                          Needs: {item.amountRequested}
                        </Badge>
                      </div>

                      {item.inventory?.category !== "CHEMICAL" ? (
                        <div className='grid grid-cols-2 gap-2 mt-2'>
                          {item.inventory?.instances &&
                          item.inventory.instances.length > 0 ? (
                            item.inventory.instances.map((inst) => (
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
                                    handleToggleInstance(
                                      item.id,
                                      inst.id,
                                      item.amountRequested,
                                    )
                                  }
                                />
                                <span className='font-mono text-sm'>
                                  {inst.controlNumber}
                                </span>
                              </label>
                            ))
                          ) : (
                            <p className='text-sm text-red-500 col-span-2'>
                              No items in "Good" condition available.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className='text-xs text-slate-400 italic'>
                          Chemicals do not require control numbers.
                        </p>
                      )}
                    </div>
                  ))}
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
              onClick={handlePrint}
              className='bg-navy hover:bg-blue text-white'
            >
              <Printer className='w-4 h-4 mr-2' /> Print Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PRINT LAYOUT */}
      {selectedBundle && (
        <div className='hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999]'>
          {/* TOP HALF */}
          <div className='h-[5.5in] w-[8.5in] border-b-2 border-dashed border-gray-400 p-8 flex flex-col justify-between'>
            <div>
              <div className='flex justify-between items-start mb-6'>
                <div>
                  <h2 className='text-2xl font-bold uppercase tracking-tight'>
                    Equipment Borrowing Agreement
                  </h2>
                  <p className='text-sm text-gray-500 font-medium'>
                    Bicol University Polangui - Computer Science Dept.
                  </p>
                </div>
                <div className='text-right text-sm font-semibold'>
                  Date: {new Date().toLocaleDateString()}
                  <br />
                  Ref: BNDL-{selectedBundle.bundleId.toString().substring(0, 8)}
                </div>
              </div>

              <div className='space-y-4 text-sm text-justify leading-relaxed'>
                <p>
                  I, <strong>{selectedBundle.user?.name}</strong>, formally
                  acknowledge the receipt of the following laboratory
                  equipment/materials:
                </p>

                <ul className='list-disc ml-8 font-semibold text-sm'>
                  {selectedBundle.items.map((item) => (
                    <li key={item.id} className='mb-2'>
                      <div>
                        {item.amountRequested} {item.inventory?.unit} -{" "}
                        {item.inventory?.name}
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
                  <strong>Stated Purpose:</strong> {selectedBundle.reason}
                </p>
                <p>
                  By signing this agreement, I assume full responsibility for
                  the care, proper usage, and timely return of the
                  aforementioned items. I understand that any damage, loss, or
                  failure to return the items will result in a hold on my
                  clearance and liability for replacement costs.
                </p>
              </div>
            </div>

            <div className='flex justify-between mt-8 text-center pt-8'>
              <div className='w-64'>
                <div className='border-b border-black mb-1'></div>
                <p className='text-xs font-semibold uppercase'>
                  {selectedBundle.user?.name}
                </p>
                <p className='text-xs text-gray-500'>Student Signature</p>
              </div>
              <div className='w-64'>
                <div className='border-b border-black mb-1'></div>
                <p className='text-xs font-semibold uppercase'>
                  Admin / Lab Custodian
                </p>
                <p className='text-xs text-gray-500'>Authorized Signature</p>
              </div>
            </div>
          </div>

          {/* BOTTOM HALF */}
          <div className='h-[5.5in] w-[8.5in] p-8 flex flex-col items-center justify-center relative'>
            <div className='absolute top-0 left-0 w-full text-center -mt-3'>
              <span className='bg-white px-2 text-xs text-gray-400 font-mono tracking-widest flex justify-center items-center gap-2'>
                ✂ CUT ALONG THE DOTTED LINE
              </span>
            </div>

            <h1 className='text-3xl font-black uppercase tracking-widest border-2 border-black px-6 py-2 rounded-md mb-8'>
              Official Lab Permit
            </h1>

            <div className='flex items-center gap-10 w-full max-w-2xl border-2 border-gray-200 rounded-xl p-8 bg-gray-50/50'>
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

              <div className='flex-1 space-y-4'>
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
                  <div className='text-md font-semibold text-black leading-tight space-y-2'>
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

                <div className='grid grid-cols-2 gap-4 border-t border-gray-200 pt-4 mt-4'>
                  <div>
                    <p className='text-[10px] text-gray-500 font-bold uppercase'>
                      Date Issued
                    </p>
                    <p className='text-sm font-semibold'>
                      {new Date().toLocaleDateString()}
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
        </div>
      )}

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