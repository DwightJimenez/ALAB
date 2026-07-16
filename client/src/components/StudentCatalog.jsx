import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2 } from "lucide-react";

const StudentCatalog = () => {
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");

  // Fetch the master catalog
  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // --- CART LOGIC ---
  const handleAddToCart = (item, requestedQty) => {
    const qty = parseInt(requestedQty);
    if (!qty || qty <= 0) return;

    setCart((prevCart) => {
      // Check if item is already in cart
      const existingItemIndex = prevCart.findIndex(
        (c) => c.inventoryId === item.id,
      );

      if (existingItemIndex >= 0) {
        // Update quantity if already exists
        const updatedCart = [...prevCart];
        const newTotal = updatedCart[existingItemIndex].quantity + qty;

        // Prevent requesting more than total stock
        updatedCart[existingItemIndex].quantity = Math.min(
          newTotal,
          item.totalQuantity,
        );
        return updatedCart;
      } else {
        // Add new item to cart
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
    setCheckoutMessage("");
    try {
      const response = await fetch(
        `${API_URL}/api/requests/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ cartItems: cart }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCheckoutMessage("Request submitted successfully!");
      setCart([]); // Empty the cart

      // Clear success message after 3 seconds
      setTimeout(() => setCheckoutMessage(""), 3000);
    } catch (err) {
      setCheckoutMessage(err.message || "Checkout failed.");
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
              {item.category}
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
      <div className="flex justify-between items-center mb-8 bg-sky p-4 rounded-xl shadow-sm border border-cold">
        <div>
          <h1 className="text-2xl font-extrabold text-navy tracking-tight">
            Lab Materials Catalog
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            Browse and request items for your upcoming experiments.
          </p>
        </div>

        {/* --- SHOPPING CART SHEET --- */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="relative border-2 border-slate-200 hover:border-cold hover:bg-cold h-12 px-6"
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
              {checkoutMessage && (
                <div
                  className={`p-3 text-sm font-bold text-center rounded-md ${checkoutMessage.includes("success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                  {checkoutMessage}
                </div>
              )}
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

      {/* --- CATALOG GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {catalog.map((item) => (
          <CatalogItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default StudentCatalog;
