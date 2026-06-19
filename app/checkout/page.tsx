"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// --- STRICT TYPES ---
interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
}
interface CartItem extends Product {
  cartQuantity: number;
}
interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
}
interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
}
// Fixed 'any' type by strictly defining the Razorpay instance
interface RazorpayInstance {
  open: () => void;
}
interface CustomWindow extends Window {
  Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
}

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Checkout Selections
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">(
    "RAZORPAY",
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Inline "Add Address" Form
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
  });

  // Wrapped in useCallback and moved ABOVE useEffect to satisfy React Compiler
  const fetchData = useCallback(async () => {
    try {
      const [cartRes, profileRes] = await Promise.all([
        fetch("/api/cart"),
        fetch("/api/profile"),
      ]);
      const cartData = await cartRes.json();
      const profileData = await profileRes.json();

      setCart(cartData);
      setAddresses(profileData.addresses || []);

      const defaultAddr = profileData.addresses?.find(
        (a: Address) => a.isDefault,
      );
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);

      setLoading(false);
    } catch (err) {
      console.error("Failed to load checkout data", err);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      // Wrap in setTimeout to satisfy the set-state-in-effect rule
      setTimeout(() => {
        fetchData();
      }, 0);
    }
  }, [status, router, fetchData]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      if (res.ok) {
        const addedAddress = await res.json();
        setAddresses([...addresses, addedAddress]);
        setSelectedAddressId(addedAddress.id);
        setIsAddingAddress(false);
        setNewAddress({
          name: "",
          street: "",
          city: "",
          state: "",
          zipCode: "",
          phone: "",
        });
      }
    } catch (err) {
      console.error("Failed to add address", err);
    }
  };

  const handleCheckout = async () => {
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) {
      toast.error("Please select a delivery address.");
      return;
    }

    setIsCheckingOut(true);
    const formattedAddress = `${selectedAddress.name}, ${selectedAddress.phone} | ${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.zipCode}`;

    const payload = {
      customerEmail: session?.user?.email,
      items: cart.map(i => ({ productId: i.id, quantity: i.cartQuantity })),
      shippingAddress: formattedAddress,
      paymentMethod,
    };

    try {
      if (paymentMethod === "COD") {
        const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        
        if (!res.ok) {
          // THE FIX: Trigger the toast and immediately exit, no error thrown!
          toast.error(data.error || "Failed to place order.");
          return; 
        }
        
        toast.success("Order placed successfully via Cash on Delivery!");
        router.push("/orders");

      } else {
        // Razorpay Flow
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          toast.error("Razorpay failed to load.");
          return;
        }

        const init = await fetch("/api/razorpay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: payload.items }) });
        const orderData = await init.json();
        
        if (!init.ok) {
          // THE FIX: Trigger the toast and immediately exit
          toast.error(orderData.error || "Failed to initialize payment.");
          return; 
        }
        
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Lunora Living",
          order_id: orderData.id,
          theme: { color: "#000000" },
          handler: async (response: RazorpaySuccessResponse) => {
            const finalRes = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, paymentId: response.razorpay_payment_id }) });
            const finalData = await finalRes.json();
            
            if (!finalRes.ok) {
              toast.error(finalData.error || "Payment succeeded, but order failed to save.");
              return;
            }
            
            toast.success("Payment successful!");
            router.push("/orders");
          }
        };
        
        const customWindow = window as unknown as CustomWindow;
        if (customWindow.Razorpay) {
          const paymentObject = new customWindow.Razorpay(options);
          paymentObject.open();
        }
      }
    } catch (err) {
      // This catch block will now ONLY run if the internet disconnects or the server completely dies
      console.error("Critical System Error:", err);
      toast.error("A critical error occurred. Please check your connection.");
    } finally {
      // This always runs at the end to turn off the "Processing..." button
      setIsCheckingOut(false);
    }
  };
  if (loading || status === "loading")
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        Loading Secure Checkout...
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
        <h2 className="text-2xl font-serif font-bold mb-4">
          Your cart is empty
        </h2>
        <Link
          href="/"
          className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800"
        >
          Return to Shop
        </Link>
      </div>
    );

  const cartTotalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.cartQuantity,
    0,
  );

  return (
    <div className="min-h-screen bg-[#F1F3F6] text-[#222222] font-sans pb-12">
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff', fontWeight: '500' } }} />
      <nav className="flex justify-between items-center px-8 py-6 bg-white border-b border-gray-200 shadow-sm">
        <Link href="/" className="text-2xl font-serif tracking-tight font-bold">
          Lunora Living
        </Link>
        <span className="text-lg font-medium text-gray-500">
          Secure Checkout
        </span>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: DELIVERY ADDRESS */}
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-4">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-sm text-xs font-bold">
                1
              </span>
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                Delivery Address
              </h2>
            </div>

            <div className="p-6">
              {addresses.length > 0 && !isAddingAddress && (
                <div className="space-y-4 mb-6">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-4 p-4 border rounded-md cursor-pointer transition-colors ${selectedAddressId === addr.id ? "border-blue-500 bg-blue-50/30" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 w-4 h-4 text-blue-600"
                      />
                      <div>
                        <p className="font-bold text-gray-900">
                          {addr.name}{" "}
                          <span className="font-medium text-gray-600 ml-2">
                            {addr.phone}
                          </span>
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          {addr.street}, {addr.city}, {addr.state} -{" "}
                          <span className="font-bold">{addr.zipCode}</span>
                        </p>
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="text-blue-600 font-medium hover:underline text-sm"
                  >
                    + Add a new address
                  </button>
                </div>
              )}

              {/* Add New Address Form */}
              {(isAddingAddress || addresses.length === 0) && (
                <div className="bg-gray-50 p-6 rounded-md border border-gray-200">
                  <h3 className="font-bold mb-4">Add a new address</h3>
                  <form onSubmit={handleAddAddress} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        required
                        type="text"
                        placeholder="Name"
                        value={newAddress.name}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, name: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-blue-500"
                      />
                      <input
                        required
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={newAddress.phone}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            phone: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-blue-500"
                      />
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="Address (Street, Building, Area)"
                      value={newAddress.street}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, street: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-blue-500"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        required
                        type="text"
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, city: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-blue-500"
                      />
                      <input
                        required
                        type="text"
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            state: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-blue-500"
                      />
                      <input
                        required
                        type="text"
                        placeholder="Pincode"
                        value={newAddress.zipCode}
                        onChange={(e) =>
                          setNewAddress({
                            ...newAddress,
                            zipCode: e.target.value,
                          })
                        }
                        className="w-full border border-gray-300 rounded-md p-3 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex gap-4 pt-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-8 py-3 rounded-sm font-bold shadow-sm hover:bg-blue-700"
                      >
                        SAVE AND DELIVER HERE
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddingAddress(false)}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: PAYMENT OPTIONS */}
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-4">
              <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-sm text-xs font-bold">
                2
              </span>
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                Payment Options
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <label
                className={`flex items-center gap-4 p-4 border rounded-md cursor-pointer transition-colors ${paymentMethod === "RAZORPAY" ? "border-blue-500 bg-blue-50/30" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "RAZORPAY"}
                  onChange={() => setPaymentMethod("RAZORPAY")}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="font-bold text-gray-900">
                    Pay Online (Razorpay)
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Recommended for faster delivery
                  </p>
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-4 border rounded-md cursor-pointer transition-colors ${paymentMethod === "COD" ? "border-blue-500 bg-blue-50/30" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <p className="font-bold text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pay at your doorstep
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 sticky top-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-gray-500 font-bold uppercase tracking-wide text-sm">
                Price Details
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between text-gray-700">
                <span>
                  Price (
                  {cart.reduce((sum, item) => sum + item.cartQuantity, 0)}{" "}
                  items)
                </span>
                <span>${cartTotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Delivery Charges</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-4 mt-4 flex justify-between font-bold text-lg text-gray-900">
                <span>Total Amount</span>
                <span>${cartTotalAmount.toFixed(2)}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isCheckingOut || !selectedAddressId}
                className="w-full mt-6 bg-[#FB641B] text-white py-4 rounded-sm font-bold shadow-md hover:bg-[#f35910] transition-colors disabled:bg-gray-400 text-lg uppercase tracking-wide"
              >
                {isCheckingOut ? "Processing..." : "Place Order"}
              </button>

              {!selectedAddressId && (
                <p className="text-red-500 text-xs text-center mt-2 font-medium">
                  Please select a delivery address to proceed.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
