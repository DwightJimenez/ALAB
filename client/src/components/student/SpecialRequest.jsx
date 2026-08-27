import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
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
  DialogDescription,
  DialogFooter,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import QRCode from "react-qr-code";
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
  Search,
  Printer,
  Info,
  FileSignature,
} from "lucide-react";
import LogoLoader from "../LogoLoader";

const SpecialRequest = ({ requiredMaterials = [], activeGroupId = null }) => {
  const user = useSelector((state) => state.auth?.user);

  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  // --- Print States ---
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [bundleToPrint, setBundleToPrint] = useState(null);

  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState("");

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

      const groupedData = data.reduce((acc, req) => {
        const key = req.bundleId || `legacy-${req.id}`;

        if (!acc[key]) {
          acc[key] = {
            bundleId: key,
            reason: req.reason,
            notedBy: req.notedBy,
            createdAt: req.createdAt,
            status: req.status,
            requestScope: req.groupId ? "Group" : "Personal",
            requestType: req.requestType,
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

      const groupedArray = Object.values(groupedData).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      setMyRequests(groupedArray);
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
      await Promise.all(
        requestToCancel.reqIds.map((id) =>
          fetch(`${API_URL}/api/requests/${id}/cancel`, {
            method: "PUT",
            credentials: "include",
          }),
        ),
      );

      toast.success("Request cancelled successfully.");
      fetchMyRequests();
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setRequestToCancel(null);
    }
  };

  const openPrintPreview = (bundle) => {
    setBundleToPrint(bundle);
    setIsPrintPreviewOpen(true);
  };

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

  const getBundleStatusInfo = (bundle) => {
    const isProcessed = bundle.items.some(
      (item) =>
        item.assignedControlNumbers && item.assignedControlNumbers.length > 0,
    );

    if (bundle.status === "PENDING") {
      if (isProcessed) {
        return {
          canPrint: true,
          badge: (
            <Badge className='bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border-none flex items-center gap-1 w-fit'>
              <FileSignature size={12} /> Ready for Signature
            </Badge>
          ),
          message:
            "The laboratory custodian has processed your items and assigned control numbers. Please print this form, have it signed by your subject teacher, and return it to the custodian to release the items.",
        };
      }
      return {
        canPrint: false,
        badge: (
          <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-200 border-none flex items-center gap-1 w-fit'>
            <Clock size={12} /> Under Review
          </Badge>
        ),
        message:
          "Your request is currently queued. Please wait for the laboratory custodian to review your materials and assign equipment control numbers.",
      };
    }

    if (bundle.status === "APPROVED") {
      return {
        canPrint: true,
        badge: (
          <Badge className='bg-green-100 text-green-800 hover:bg-green-200 border-none flex items-center gap-1 w-fit'>
            <CheckCircle2 size={12} /> Released
          </Badge>
        ),
        message:
          "Items are officially released and in use. Please handle all equipment with care and return promptly after use.",
      };
    }

    if (bundle.status === "REJECTED") {
      return {
        canPrint: false,
        badge: (
          <Badge className='bg-red-100 text-red-800 hover:bg-red-200 border-none flex items-center gap-1 w-fit'>
            <XCircle size={12} /> Declined
          </Badge>
        ),
        message: "This request was declined by the laboratory custodian.",
      };
    }

    if (bundle.status === "CANCELLED") {
      return {
        canPrint: false,
        badge: (
          <Badge className='bg-slate-100 text-slate-600 hover:bg-slate-200 border-none flex items-center gap-1 w-fit'>
            <Ban size={12} /> Cancelled
          </Badge>
        ),
        message: "This request has been cancelled.",
      };
    }

    if (bundle.status === "RETURNED") {
      return {
        canPrint: false,
        badge: (
          <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-200 border-none flex items-center gap-1 w-fit'>
            <CheckCircle2 size={12} /> Returned
          </Badge>
        ),
        message:
          "Equipment has been successfully returned and your clearance is completed.",
      };
    }

    return {
      canPrint: false,
      badge: <Badge variant='outline'>{bundle.status}</Badge>,
      message: "",
    };
  };

  // Extract Request Card rendering to avoid duplication in Tabs
  const renderBundleCard = (bundle) => {
    const { badge, message, canPrint } = getBundleStatusInfo(bundle);
    const { cleanReason } = getExtractedData(bundle);

    return (
      <div
        key={bundle.bundleId}
        className='flex flex-col bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-4'
      >
        <div className='bg-slate-50 p-3 border-b flex justify-between items-center'>
          <div className='flex gap-2 items-center'>
            {badge}
            {bundle.requestScope === "Group" && (
              <Badge className='bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none'>
                <Users size={12} className='mr-1' /> Group
              </Badge>
            )}
          </div>
          <span className='text-xs text-slate-500 font-medium'>
            {new Date(bundle.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className='p-4'>
          <div className='flex gap-2 items-start bg-blue-50/50 p-3 rounded-md mb-4 border border-blue-100'>
            <Info className='w-4 h-4 text-blue-500 mt-0.5 shrink-0' />
            <p className='text-sm text-blue-900 leading-tight'>{message}</p>
          </div>

          <ul className='text-sm space-y-1.5 mb-4'>
            {bundle.items.map((item) => (
              <li
                key={item.id}
                className='flex justify-between items-center border-b border-slate-100 pb-1 last:border-0'
              >
                <span className='text-slate-700 font-medium'>
                  {item.amountRequested}{" "}
                  {item.inventory?.category === "CHEMICAL"
                    ? item.inventory?.unit
                    : "x"}{" "}
                  - {item.inventory?.name}
                </span>
                {item.assignedControlNumbers?.length > 0 && (
                  <span className='text-[10px] font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100'>
                    CN: {item.assignedControlNumbers.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {cleanReason && (
            <div className='bg-slate-50 p-3 rounded text-xs text-slate-600 border border-slate-100'>
              <span className='font-semibold text-slate-700 block mb-1'>
                Purpose:
              </span>
              {cleanReason}
            </div>
          )}
        </div>

        <div className='p-3 bg-slate-50 border-t flex justify-end gap-2'>
          {canPrint && (
            <Button
              size='sm'
              className='bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
              onClick={() => openPrintPreview(bundle)}
            >
              <Printer className='w-4 h-4 mr-2' /> Print Document
            </Button>
          )}
          {bundle.status === "PENDING" && !canPrint && (
            <Button
              variant='outline'
              size='sm'
              className='text-red-600 border-red-200 hover:bg-red-50'
              onClick={() => setRequestToCancel(bundle)}
            >
              Cancel Request
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading)
    return (
      <div className='p-10 text-center text-slate-500 font-medium flex items-center justify-center min-h-[50vh]'>
        <LogoLoader size='sm' />
      </div>
    );
  if (error)
    return <div className='p-10 text-center text-red-500'>{error}</div>;

  const totalItemsInCart = cart.length;

  const searchedCatalog = catalog.filter((item) => {
    const term = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term)
    );
  });

  const requiredIds = requiredMaterials.map((m) => Number(m.inventoryId));
  const requiredCatalogItems = searchedCatalog.filter((item) =>
    requiredIds.includes(item.id),
  );
  const otherCatalogItems = searchedCatalog.filter(
    (item) => !requiredIds.includes(item.id),
  );

  // Divide the requests into Active and History categories
  const activeBundles = myRequests.filter((b) =>
    ["PENDING", "APPROVED"].includes(b.status),
  );
  const historyBundles = myRequests.filter((b) =>
    ["RETURNED", "CANCELLED", "REJECTED"].includes(b.status),
  );

  return (
    <div className='min-h-screen w-full relative pb-10 pt-32 sm:pt-28 px-4 sm:px-6'>
      <div className='fixed top-16 left-18 xl:left-2 right-2 z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-sky/60 rounded-b-3xl backdrop-blur-md p-4 shadow-sm border-b border-cold gap-4 mx-auto max-w-[1600px]'>
        <div>
          <h1 className='text-2xl font-extrabold text-navy tracking-tight'>
            Lab Materials Catalog
          </h1>
          <p className='text-slate-500 text-sm font-medium mt-1'>
            Browse and request items for your upcoming experiments.
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0'>
          {/* SEARCH BAR */}
          <div className='relative w-full sm:w-64 xl:w-80'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            <Input
              type='text'
              placeholder='Search materials or categories...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-9 h-12 bg-white border-2 border-slate-200 focus-visible:ring-navy'
            />
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
              <DialogContent className='sm:max-w-[650px] bg-white p-0 gap-0'>
                <DialogHeader className='p-6 pb-2'>
                  <DialogTitle className='text-xl text-navy flex items-center gap-2'>
                    <ClipboardList className='w-5 h-5' /> My Request History
                  </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue='active' className='w-full'>
                  <TabsList variant="line">
                    <TabsTrigger value='active'>
                      Active Requests ({activeBundles.length})
                    </TabsTrigger>
                    <TabsTrigger value='history'>
                      History ({historyBundles.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value='active' className='mt-0'>
                    <ScrollArea className='h-[55vh] p-6 pt-4'>
                      {activeBundles.length === 0 ? (
                        <p className='text-center text-slate-500 py-10'>
                          You have no active requests.
                        </p>
                      ) : (
                        activeBundles.map(renderBundleCard)
                      )}
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value='history' className='mt-0'>
                    <ScrollArea className='h-[55vh] p-6 pt-4'>
                      {historyBundles.length === 0 ? (
                        <p className='text-center text-slate-500 py-10'>
                          Your request history is empty.
                        </p>
                      ) : (
                        historyBundles.map(renderBundleCard)
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
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
                        Noted by (Teacher){" "}
                        <span className='text-red-500'>*</span>
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
      </div>

      <div>
        {requiredCatalogItems.length > 0 && (
          <h2 className='text-xl font-extrabold text-slate-800 mb-4 mt-8 sm:mt-0'>
            Required Materials
          </h2>
        )}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10'>
          {requiredCatalogItems.map((item) => (
            <CatalogItem key={item.id} item={item} isRequired={true} />
          ))}
        </div>

        {otherCatalogItems.length > 0 && (
          <h2 className='text-xl font-extrabold text-slate-800 mb-4'>
            Other Available Materials
          </h2>
        )}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
          {otherCatalogItems.map((item) => (
            <CatalogItem key={item.id} item={item} isRequired={false} />
          ))}
          {otherCatalogItems.length === 0 &&
            requiredCatalogItems.length === 0 && (
              <p className='text-slate-500 col-span-full py-10 text-center font-medium'>
                No materials found matching "{searchQuery}".
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
              Are you sure you want to cancel this entire request bundle?
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
      {bundleToPrint &&
        (() => {
          const { cleanReason, notedByText } = getExtractedData(bundleToPrint);
          const userName = user?.name || "Student";

          return (
            <div
              id='print-section'
              className='hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999]'
            >
              {/* TOP HALF: OFFICIAL PERMIT */}
              <div className='h-[5.5in] w-[8.5in] p-8 flex flex-col items-center justify-center relative'>
                <h1 className='text-3xl font-black uppercase tracking-widest border-2 border-black px-6 py-2 rounded-md mb-8'>
                  {bundleToPrint.status === "PENDING"
                    ? "Laboratory Borrowing Form"
                    : "Official Lab Permit"}
                </h1>

                <div className='flex items-center gap-10 w-full max-w-3xl border-2 border-gray-200 rounded-xl p-8 bg-gray-50/50'>
                  <div className='flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm'>
                    <QRCode
                      value={JSON.stringify({
                        bundleId: bundleToPrint.bundleId,
                        studentId: user?.id,
                        type: "SPECIAL_REQUEST_BUNDLE",
                        items: bundleToPrint.items.map((item) => ({
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
                      <p className='text-xl font-bold text-black'>{userName}</p>
                    </div>

                    <div>
                      <p className='text-xs text-gray-500 font-bold uppercase tracking-wider mb-1'>
                        Requested Materials
                      </p>
                      <div className='grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-md font-semibold text-black leading-tight'>
                        {bundleToPrint.items.map((item) => (
                          <div key={item.id}>
                            <div>
                              {item.amountRequested}x {item.inventory?.name}
                            </div>
                            {item.assignedControlNumbers?.length > 0 ? (
                              <div className='text-xs text-gray-500 font-normal font-mono mt-0.5'>
                                CN: {item.assignedControlNumbers.join(", ")}
                              </div>
                            ) : (
                              <div className='text-xs text-gray-500 font-normal font-mono mt-1'>
                                CN: ___________________
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className='grid grid-cols-3 gap-4 border-t border-gray-200 pt-4 mt-4'>
                      <div>
                        <p className='text-[10px] text-gray-500 font-bold uppercase'>
                          Date{" "}
                          {bundleToPrint.status === "PENDING"
                            ? "Printed"
                            : "Issued"}
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
                        <p
                          className={`text-sm font-bold uppercase tracking-widest ${bundleToPrint.status === "PENDING" ? "text-amber-500" : "text-green-600"}`}
                        >
                          {bundleToPrint.status === "PENDING"
                            ? "FOR SIGNATURE"
                            : "RELEASED"}
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
                      {bundleToPrint.bundleId.toString().substring(0, 8)}
                    </div>
                  </div>

                  <div className='space-y-4 text-sm text-justify leading-relaxed'>
                    <p>
                      I, <strong>{userName}</strong>, formally acknowledge the
                      receipt of the following laboratory equipment/materials:
                    </p>

                    <ul className='grid grid-cols-2 gap-x-8 gap-y-2 list-disc ml-6 font-semibold text-sm'>
                      {bundleToPrint.items.map((item) => (
                        <li key={item.id} className='pl-1'>
                          <div>
                            {item.amountRequested}{" "}
                            {item.inventory?.category === "CHEMICAL"
                              ? item.inventory?.unit
                              : "pcs"}{" "}
                            - {item.inventory?.name}
                          </div>
                          {item.assignedControlNumbers?.length > 0 ? (
                            <div className='text-xs text-gray-500 font-normal font-mono mt-0.5'>
                              CN: {item.assignedControlNumbers.join(", ")}
                            </div>
                          ) : (
                            <div className='text-xs text-gray-500 font-normal font-mono mt-0.5'>
                              CN: ___________________
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
                      {userName}
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
          body * { 
            visibility: hidden !important; 
          }

          div[role="dialog"], div[role="presentation"], [data-radix-portal] {
            display: none !important;
          }
          
          #print-section, #print-section * { 
            visibility: visible !important; 
          }
          
          #print-section { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            margin: 0 !important; 
            padding: 0 !important;
            z-index: 999999 !important;
            display: block !important;
          }

          html, body { 
            pointer-events: auto !important; 
            overflow: visible !important;
            height: auto !important;
          }

          @page { size: letter portrait; margin: 0; }
        }
      `,
        }}
      />
    </div>
  );
};

export default SpecialRequest;
