import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ShoppingCart, Trash2, ClipboardList, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";

const StudentCatalog = () => {
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // My Requests State
  const [myRequests, setMyRequests] = useState([]);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [requestToCancel, setRequestToCancel] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;

  // --- FETCH DATA ---
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
      // Adjust this endpoint to match your backend route for fetching a student's own requests
      const response = await fetch(`${API_URL}/api/requests/me`, {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMyRequests(data);
      }
    } catch (err) {
      console.error("Failed to load personal requests", err);
    }
  };

  useEffect(() => {
    fetchCatalog();
    fetchMyRequests();
  }, []);

  // --- CART LOGIC ---
  const handleAddToCart = (item, requestedQty) => {
    const qty = parseInt(requestedQty);
    if (!qty || qty <= 0) return;

    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (c) => c.inventoryId === item.id,
      );

      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart];
        const newTotal = updatedCart[existingItemIndex].quantity + qty;
        updatedCart[existingItemIndex].quantity = Math.min(newTotal, item.totalQuantity);
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
            quantity: Math.min(qty, item.totalQuantity),
            imageUrl: item.imageUrl,
          },
        ];
      }
    });
  };

  const removeFromCart = (inventoryId) => {
    setCart(cart.filter((item) => item.inventoryId !== inventoryId));
  };

  const handleCheckout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/requests/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ cartItems: cart }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("Request submitted successfully!");
      setCart([]); // Empty the cart
      fetchMyRequests(); // Refresh the user's requests list
    } catch (err) {
      toast.error(err.message || "Checkout failed.");
    }
  };

  // --- CANCEL REQUEST LOGIC ---
  const handleCancelRequest = async () => {
    if (!requestToCancel) return;
    try {
      const response = await fetch(`${API_URL}/api/requests/${requestToCancel}/cancel`, {
        method: "PUT",
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to cancel request");

      toast.success("Request cancelled successfully.");
      fetchMyRequests(); // Refresh the list to show it as cancelled
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setRequestToCancel(null);
    }
  };

  // --- ITEM CARD COMPONENT ---
  const CatalogItem = ({ item }) => {
    const [qty, setQty] = useState(1);

    return (
      <Card className="flex flex-col h-full border-2 hover:border-cold transition-colors">
        <CardHeader className="p-4 pb-2 text-center h-32 flex items-center justify-center bg-slate-50 border-b">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full object-contain mix-blend-multiply"
            />
          ) : (
            <div className="text-slate-400 font-medium">No Image</div>
          )}
        </CardHeader>
        <CardContent className="p-4 flex-grow space-y-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg text-slate-800 leading-tight">
              {item.name}
            </CardTitle>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-100 text-slate-500 rounded">
              {item.category === 'CLEANING' ? 'CLEANING TOOLS' : item.category}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Available:{" "}
            <span
              className={
                item.totalQuantity > 0 ? "text-green-600" : "text-red-500"
              }
            >
              {item.totalQuantity} {item.unit}
            </span>
          </p>
        </CardContent>
        <CardFooter className="p-4 pt-0 gap-2">
          <Input
            type="number"
            min="1"
            max={item.totalQuantity}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={item.totalQuantity <= 0}
            className="w-20 bg-white"
          />
          <Button
            className="flex-1 bg-navy hover:bg-blue text-white"
            onClick={() => handleAddToCart(item, qty)}
            disabled={item.totalQuantity <= 0}
          >
            Add
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // --- HELPER FOR STATUS BADGES ---
  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none flex items-center gap-1"><Clock size={12}/> Pending</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none flex items-center gap-1"><CheckCircle2 size={12}/> Approved</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none flex items-center gap-1"><XCircle size={12}/> Rejected</Badge>;
      case "CANCELLED":
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none flex items-center gap-1"><Ban size={12}/> Cancelled</Badge>;
      case "RETURNED":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none flex items-center gap-1"><CheckCircle2 size={12}/> Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-slate-500 font-medium">
        Loading catalog...
      </div>
    );
  if (error)
    return <div className="p-10 text-center text-red-500">{error}</div>;

  const totalItemsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className=" min-h-screen p-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-sky p-4 rounded-xl shadow-sm border border-cold gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">
            Lab Materials Catalog
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Browse and request items for your upcoming experiments.
          </p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          {/* --- MY REQUESTS DIALOG --- */}
          <Dialog open={isRequestsModalOpen} onOpenChange={setIsRequestsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none border-2 border-slate-200 hover:border-cold hover:bg-cold h-12 px-4">
                <ClipboardList className="w-5 h-5 mr-2 text-slate-700" />
                <span className="font-bold text-slate-700">My Requests</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle className="text-xl text-navy flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> My Request History
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] mt-4 pr-4">
                {myRequests.length === 0 ? (
                  <p className="text-center text-slate-500 py-10">You have no requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {myRequests.map((req) => (
                      <div key={req.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">{req.inventory?.name}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            Qty: {req.amountRequested} {req.inventory?.unit}
                          </p>
                          <div className="mt-2">
                            {getStatusBadge(req.status)}
                          </div>
                        </div>
                        <div>
                          {req.status === "PENDING" && (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => setRequestToCancel(req.id)}
                            >
                              Cancel Request
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* --- SHOPPING CART SHEET --- */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 sm:flex-none relative border-2 border-slate-200 hover:border-cold hover:bg-cold h-12 px-6"
              >
                <ShoppingCart className="w-5 h-5 mr-2 text-slate-700" />
                <span className="font-bold text-slate-700">Lab Cart</span>
                {totalItemsInCart > 0 && (
                  <span className="absolute -top-2 -right-2 bg-navy text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                    {totalItemsInCart}
                  </span>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent className="w-full sm:max-w-md flex flex-col bg-white">
              <SheetHeader className="border-b pb-4">
                <SheetTitle className="text-xl font-bold flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-navy" /> Request Cart
                </SheetTitle>
              </SheetHeader>

              <ScrollArea className="flex-1 py-4">
                {cart.length === 0 ? (
                  <div className="text-center text-slate-400 py-10 font-medium">
                    Your cart is empty.
                    <br />
                    Add some items from the catalog!
                  </div>
                ) : (
                  <div className="space-y-4 pr-4">
                    {cart.map((item) => (
                      <div
                        key={item.inventoryId}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-white border rounded flex items-center justify-center overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                className="h-full object-contain"
                                alt=""
                              />
                            ) : (
                              <span className="text-xs text-slate-300">N/A</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">
                              {item.name}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">
                              Qty: {item.quantity} {item.unit}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.inventoryId)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <SheetFooter className="border-t pt-4 flex-col gap-3 sm:flex-col">
                <Button
                  className="w-full bg-navy hover:bg-blue text-white h-12 text-lg font-bold"
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                >
                  Submit Booking Request
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* --- CATALOG GRID --- */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {catalog.map((item) => (
          <CatalogItem key={item.id} item={item} />
        ))}
      </div>

      {/* CANCEL CONFIRMATION ALERT DIALOG */}
      <AlertDialog open={!!requestToCancel} onOpenChange={(open) => !open && setRequestToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Cancel Request</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default StudentCatalog;