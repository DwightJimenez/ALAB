import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart,
  Trash2,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Star,
  Users,
  FileText,
  Loader2,
  UserCheck,
} from "lucide-react";
import LogoLoader from "../LogoLoader";

const SpecialRequest = ({ requiredMaterials = [], activeGroupId = null }) => {
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  // --- States for Request Explanation, Teacher & Checkout ---
  const [requestReason, setRequestReason] = useState("");
  const [notedBy, setNotedBy] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchCatalog = async () => {
    try {
      const response = await fetch(`${API_URL}/api/inventory`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCatalog(data);
    } catch (err) {
      setError("Could not load the catalog.");
      toast.error("Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const url = activeGroupId
        ? `${API_URL}/api/requests/me?groupId=${activeGroupId}`
        : `${API_URL}/api/requests/me`;

      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch requests");

      const data = await response.json();

      const taggedData = data.map((req) => ({
        ...req,
        requestScope: req.groupId ? "Group" : "Personal",
      }));

      setMyRequests(taggedData);
    } catch (err) {
      console.error("Failed to load requests", err);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchMyRequests();
  }, [activeGroupId]);

  useEffect(() => {
    if (
      catalog.length > 0 &&
      requiredMaterials.length > 0 &&
      cart.length === 0
    ) {
      const requiredIds = requiredMaterials.map((m) => Number(m.inventoryId));

      const initialCart = catalog
        .filter((item) => requiredIds.includes(item.id))
        .map((item) => {
          const unitLower = (item.unit || "").toLowerCase();
          const isVolumeOrMass = [
            "ml",
            "l",
            "g",
            "kg",
            "grams",
            "liters",
            "milliliters",
          ].includes(unitLower);
          const defaultQty = isVolumeOrMass
            ? Math.min(50, item.totalQuantity ?? 50)
            : 1;

          return {
            inventoryId: item.id,
            name: item.name,
            unit: item.unit,
            quantity: defaultQty,
            imageUrl: item.imageUrl,
            isRequired: true,
          };
        });

      if (initialCart.length > 0) {
        setCart(initialCart);
        toast.info(
          "Required lab materials were automatically added to your cart.",
        );
      }
    }
  }, [catalog, requiredMaterials]);

  const handleAddToCart = (item, requestedQty) => {
    const qty = parseInt(requestedQty);
    if (!qty || qty <= 0) return;

    const availableQty = item.totalQuantity ?? 0;

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (c) => c.inventoryId === item.id,
      );

      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        const newTotal = updatedCart[existingItemIndex].quantity + qty;
        updatedCart[existingItemIndex].quantity = Math.min(
          newTotal,
          availableQty,
        );
        toast.success(`Updated ${item.name} quantity in cart.`);
        return updatedCart;
      } else {
        toast.success(`Added ${item.name} to cart.`);
        return [
          ...prevCart,
          {
            inventoryId: item.id,
            name: item.name,
            unit: item.unit,
            quantity: Math.min(qty, availableQty),
            imageUrl: item.imageUrl,
            isRequired: requiredMaterials.some(
              (rm) => Number(rm.inventoryId) === item.id,
            ),
          },
        ];
      }
    });
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter((item) => item.inventoryId !== inventoryId));
  };

  const handlePreCheckout = () => {
    if (!notedBy.trim()) {
      toast.error("Please specify the teacher who noted this request.");
      return;
    }
    if (!requestReason.trim()) {
      toast.error(
        "Please provide a formal explanation or purpose for this request.",
      );
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsConfirmModalOpen(false);
    setIsSubmitting(true);

    try {
      const combinedReason = `${requestReason.trim()} (Noted by: ${notedBy.trim()})`;

      const response = await fetch(`${API_URL}/api/requests/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          cartItems: cart,
          groupId: activeGroupId,
          reason: combinedReason,
          notedBy: notedBy.trim(),
          requestType: "SPECIAL",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(
        activeGroupId
          ? "Special group request submitted successfully!"
          : "Special request submitted successfully!",
      );

      setCart([]);
      setRequestReason("");
      setNotedBy("");
      fetchMyRequests();
    } catch (err) {
      toast.error(err.message || "Checkout failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;
    try {
      const response = await fetch(
        `${API_URL}/api/requests/${requestToCancel}/cancel`,
        {
          method: "PUT",
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to cancel request");

      toast.success("Request cancelled successfully.");
      fetchMyRequests();
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setRequestToCancel(null);
    }
  };

  const CatalogItem = ({ item, isRequired }) => {
    const availableQty = item.totalQuantity ?? 0;

    const unitLower = (item.unit || "").toLowerCase();
    const isVolumeOrMass = [
      "ml",
      "l",
      "g",
      "kg",
      "grams",
      "liters",
      "milliliters",
    ].includes(unitLower);
    const defaultInitialQty = isVolumeOrMass
      ? Math.min(50, availableQty > 0 ? availableQty : 50)
      : 1;

    const [qty, setQty] = useState(defaultInitialQty);

    return (
      <Card
        className={`flex flex-col h-full border-2 transition-colors relative overflow-visible ${isRequired ? "border-amber-400 hover:border-amber-500 shadow-amber-100" : "hover:border-cold"}`}
      >
        {isRequired && (
          <Badge className='absolute -top-3 -right-2 z-50 bg-amber-500 hover:bg-amber-600 text-white border-none shadow-md flex items-center gap-1'>
            <Star size={12} className='fill-white' /> Required
          </Badge>
        )}
        <CardHeader
          className={`p-4 pb-2 text-center h-32 flex items-center justify-center border-b rounded-t-lg ${isRequired ? "bg-amber-50/50" : "bg-slate-50"}`}
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className='h-full object-contain mix-blend-multiply'
            />
          ) : (
            <div className='text-slate-400 font-medium'>No Image</div>
          )}
        </CardHeader>

        <CardContent className='p-4 flex-grow space-y-2'>
          <div className='flex justify-between items-start'>
            <CardTitle className='text-lg text-slate-800 leading-tight pr-2'>
              {item.name}
            </CardTitle>
            <span className='text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 text-slate-500 rounded shrink-0'>
              {item.category === "CLEANING" ? "CLEANING TOOLS" : item.category}
            </span>
          </div>
          <p className='text-sm text-slate-500 font-medium'>
            Available:{" "}
            <span
              className={availableQty > 0 ? "text-green-600" : "text-red-500"}
            >
              {availableQty} {item.unit}
            </span>
          </p>
        </CardContent>

        <CardFooter className='p-4 pt-0 gap-2'>
          <Input
            type='number'
            min='1'
            max={availableQty}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={availableQty <= 0}
            className='w-20 bg-white'
          />
          <Button
            className={`flex-1 text-white ${isRequired ? "bg-amber-600 hover:bg-amber-700" : "bg-navy hover:bg-blue"}`}
            onClick={() => handleAddToCart(item, qty)}
            disabled={availableQty <= 0}
          >
            Add
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-200 border-none flex items-center gap-1'>
            <Clock size={12} /> Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className='bg-green-100 text-green-800 hover:bg-green-200 border-none flex items-center gap-1'>
            <CheckCircle2 size={12} /> Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className='bg-red-100 text-red-800 hover:bg-red-200 border-none flex items-center gap-1'>
            <XCircle size={12} /> Rejected
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className='bg-slate-100 text-slate-600 hover:bg-slate-200 border-none flex items-center gap-1'>
            <Ban size={12} /> Cancelled
          </Badge>
        );
      case "RETURNED":
        return (
          <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-200 border-none flex items-center gap-1'>
            <CheckCircle2 size={12} /> Returned
          </Badge>
        );
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  if (loading)
    return (
      <div className='p-10 text-center text-slate-500 font-medium flex items-center justify-center min-h-[50vh]'>
        <LogoLoader size='sm' />
      </div>
    );
  if (error)
    return <div className='p-10 text-center text-red-500'>{error}</div>;

  // Counts unique line items in cart rather than summing up volumes/quantities
  const totalItemsInCart = cart.length;

  const requiredIds = requiredMaterials.map((m) => Number(m.inventoryId));
  const requiredCatalogItems = catalog.filter((item) =>
    requiredIds.includes(item.id),
  );
  const otherCatalogItems = catalog.filter(
    (item) => !requiredIds.includes(item.id),
  );

  return (
    <div className='min-h-screen w-full relative pb-10 pt-28 px-4 sm:px-6'>
      <div className='fixed top-16 left-18 xl:left-2 right-2 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-sky/60 rounded-b-3xl backdrop-blur-md p-4 shadow-sm border-b border-cold gap-4 mx-auto max-w-[1600px]'>
        <div>
          <h1 className='text-2xl font-extrabold text-navy tracking-tight'>
            Lab Materials Catalog
          </h1>
          <p className='text-slate-500 text-sm font-medium mt-1'>
            Browse and request items for your upcoming experiments.
          </p>
        </div>

        <div className='flex gap-3 w-full sm:w-auto'>
          <Dialog
            open={isRequestsModalOpen}
            onOpenChange={setIsRequestsModalOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant='outline'
                className='flex-1 sm:flex-none border-2 border-slate-200 hover:border-cold hover:bg-cold h-12 px-4 bg-white'
              >
                <ClipboardList className='w-5 h-5 mr-2 text-slate-700' />
                <span className='font-bold text-slate-700'>My Requests</span>
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-[600px] bg-white'>
              <DialogHeader>
                <DialogTitle className='text-xl text-navy flex items-center gap-2'>
                  <ClipboardList className='w-5 h-5' /> My Request History
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className='max-h-[60vh] mt-4 pr-4'>
                {myRequests.length === 0 ? (
                  <p className='text-center text-slate-500 py-10'>
                    You have no requests yet.
                  </p>
                ) : (
                  <div className='space-y-3'>
                    {myRequests.map((req) => (
                      <div
                        key={req.id}
                        className='flex flex-col p-4 bg-slate-50 rounded-lg border border-slate-200'
                      >
                        <div className='flex justify-between items-start w-full'>
                          <div>
                            <p className='font-bold text-slate-800 flex items-center gap-2'>
                              {req.inventory?.name}
                              {req.requestScope === "Group" && (
                                <Badge className='bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-1.5 py-0 h-5 text-[10px] flex items-center gap-1'>
                                  <Users size={10} /> Group
                                </Badge>
                              )}
                              {req.requestType === "SPECIAL" && (
                                <Badge className='bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-1.5 py-0 h-5 text-[10px] flex items-center gap-1'>
                                  <Star size={10} /> Special
                                </Badge>
                              )}
                            </p>
                            <p className='text-sm text-slate-500 mt-1'>
                              Qty: {req.amountRequested} {req.inventory?.unit}
                            </p>
                          </div>
                          <div>
                            {req.status === "PENDING" && (
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() => setRequestToCancel(req.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>

                        {req.reason && (
                          <div className='mt-3 bg-white p-2 rounded text-xs text-slate-600 border border-slate-100'>
                            <span className='font-semibold text-slate-700 block mb-1'>
                              Reason:
                            </span>
                            {req.reason}
                          </div>
                        )}
                        <div className='mt-3 flex'>
                          {getStatusBadge(req.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant='outline'
                className='flex-1 sm:flex-none relative border-2 border-slate-200 hover:border-cold hover:bg-cold h-12 px-6 bg-white'
              >
                <ShoppingCart className='w-5 h-5 mr-2 text-slate-700' />
                <span className='font-bold text-slate-700'>Lab Cart</span>
                {totalItemsInCart > 0 && (
                  <span className='absolute -top-2 -right-2 bg-navy text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white'>
                    {totalItemsInCart}
                  </span>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent className='w-full sm:max-w-md flex flex-col bg-white'>
              <SheetHeader className='border-b pb-4'>
                <SheetTitle className='text-xl font-bold flex items-center'>
                  <ShoppingCart className='w-5 h-5 mr-2 text-navy' /> Request
                  Cart
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className='flex-1 py-4'>
                {cart.length === 0 ? (
                  <div className='text-center text-slate-400 py-10 font-medium'>
                    Your cart is empty.
                    <br />
                    Add some items from the catalog!
                  </div>
                ) : (
                  <div className='space-y-4 pr-4'>
                    {cart.map((item) => (
                      <div
                        key={item.inventoryId}
                        className={`flex items-center justify-between p-3 rounded-lg border ${item.isRequired ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}
                      >
                        <div className='flex items-center gap-3'>
                          <div className='h-10 w-10 bg-white border rounded flex items-center justify-center overflow-hidden'>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                className='h-full object-contain'
                                alt=''
                              />
                            ) : (
                              <span className='text-xs text-slate-300'>
                                N/A
                              </span>
                            )}
                          </div>
                          <div>
                            <p className='font-bold text-sm text-slate-800 flex items-center gap-1'>
                              {item.name}
                              {item.isRequired && (
                                <Star
                                  size={12}
                                  className='text-amber-500 fill-amber-500'
                                />
                              )}
                            </p>
                            <p className='text-xs text-slate-500 font-medium'>
                              Qty: {item.quantity} {item.unit}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => removeFromCart(item.inventoryId)}
                          className='text-red-400 hover:text-red-600 hover:bg-red-50'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <SheetFooter className='border-t pt-4 flex-col gap-3 sm:flex-col'>
                <div className='w-full space-y-4 mb-2'>
                  <div>
                    <label className='text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2'>
                      <UserCheck size={16} className='text-navy' />
                      Noted by (Teacher) <span className='text-red-500'>*</span>
                    </label>
                    <Input
                      value={notedBy}
                      onChange={(e) => setNotedBy(e.target.value)}
                      placeholder='e.g., Mr. Smith'
                      disabled={cart.length === 0 || isSubmitting}
                      className='bg-slate-50 focus-visible:ring-navy'
                    />
                  </div>
                  <div>
                    <label className='text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2'>
                      <FileText size={16} className='text-navy' />
                      Formal Explanation / Purpose{" "}
                      <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder='State the reason for requesting these items directly to the Admin...'
                      disabled={cart.length === 0 || isSubmitting}
                      className='w-full resize-none rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent min-h-[80px] disabled:opacity-50 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <Button
                  className='w-full bg-navy hover:bg-blue text-white h-12 text-lg font-bold flex items-center justify-center gap-2'
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handlePreCheckout}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className='w-5 h-5 animate-spin' />
                      Submitting Request...
                    </>
                  ) : (
                    "Submit Booking Request"
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div>
        {requiredCatalogItems.length > 0 && (
          <h2 className='text-xl font-extrabold text-slate-800 mb-4'>
            Other Available Materials
          </h2>
        )}
        <div className='mt-20 sm:mt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
          {otherCatalogItems.map((item) => (
            <CatalogItem key={item.id} item={item} isRequired={false} />
          ))}
          {otherCatalogItems.length === 0 && (
            <p className='text-slate-500 col-span-full'>
              No other materials available.
            </p>
          )}
        </div>
      </div>

      {/* CONFIRM CHECKOUT MODAL */}
      <AlertDialog
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-navy flex items-center gap-2'>
              <ClipboardList className='w-5 h-5' /> Confirm Special Request
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600 space-y-3 pt-2'>
              <p>
                You are about to submit a special request for{" "}
                <strong>{totalItemsInCart}</strong> unique item(s).
              </p>
              <div className='bg-slate-50 p-3 rounded border border-slate-200 space-y-2'>
                <p>
                  <span className='font-semibold text-slate-800'>
                    Noted by:
                  </span>{" "}
                  {notedBy}
                </p>
                <p>
                  <span className='font-semibold text-slate-800'>Reason:</span>{" "}
                  {requestReason}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCheckout}
              disabled={isSubmitting}
              className='bg-navy hover:bg-blue text-white'
            >
              Confirm Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CANCEL REQUEST MODAL */}
      <AlertDialog
        open={!!requestToCancel}
        onOpenChange={(open) => !open && setRequestToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-red-600'>
              Cancel Request
            </AlertDialogTitle>
            <AlertDialogDescription className='text-slate-600'>
              Are you sure you want to cancel this request?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelRequest();
              }}
              className='bg-red-600 hover:bg-red-700 text-white'
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpecialRequest;
