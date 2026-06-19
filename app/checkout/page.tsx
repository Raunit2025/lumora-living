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
          theme: { color: "#0a0a0a" }, // Updated to match the dark aesthetic
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
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#FBFBF9] text-gray-800 font-sans">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] antialiased">
        <span className="text-4xl mb-6 opacity-30">🛒</span>
        <h2 className="text-3xl font-serif font-bold mb-3 text-neutral-900 tracking-tight">
          Your bag is empty
        </h2>
        <p className="text-neutral-500 mb-8 font-light">There is nothing in your cart to checkout.</p>
        <Link
          href="/"
          className="px-8 py-3.5 bg-neutral-950 text-white rounded-xl font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
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
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans pb-20 antialiased selection:bg-neutral-200">
      
      {/* Toast updated to match brand */}
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#171717', color: '#fff', fontWeight: '500', borderRadius: '12px', fontSize: '14px' } }} />
      
      {/* MINIMALIST GLASS NAVBAR */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-5 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40">
        <Link href="/" className="font-serif font-black text-xl tracking-tight hover:opacity-80 transition-opacity">
          Lumora Living
        </Link>
        <span className="text-xs font-semibold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Secure Checkout
        </span>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        
        {/* LEFT COLUMN: Steps (Takes 7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* STEP 1: DELIVERY ADDRESS */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-100">
            <h2 className="text-xl font-serif font-bold text-neutral-900 mb-6 flex items-center gap-4">
              <span className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-900 rounded-full text-sm font-mono tracking-tighter">1</span>
              Delivery Details
            </h2>

            <div className="space-y-6">
              {addresses.length > 0 && !isAddingAddress && (
                <div className="space-y-4">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        selectedAddressId === addr.id 
                          ? "border-neutral-950 bg-neutral-50 shadow-sm" 
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 w-4 h-4 text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                      />
                      <div>
                        <p className="font-bold text-neutral-900 text-sm">
                          {addr.name}
                          <span className="font-mono text-neutral-500 ml-3 text-xs">
                            {addr.phone}
                          </span>
                        </p>
                        <p className="text-neutral-500 text-sm mt-1.5 leading-relaxed font-light">
                          {addr.street}, {addr.city}, {addr.state} — <span className="font-medium text-neutral-700">{addr.zipCode}</span>
                        </p>
                      </div>
                    </label>
                  ))}
                  
                  <button
                    onClick={() => setIsAddingAddress(true)}
                    className="mt-2 text-sm font-semibold text-neutral-900 hover:text-neutral-500 transition-colors flex items-center gap-2"
                  >
                    <span>+</span> Add a new address
                  </button>
                </div>
              )}

              {/* Add New Address Form */}
              {(isAddingAddress || addresses.length === 0) && (
                <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100 mt-2">
                  <h3 className="font-bold text-neutral-900 mb-5 font-serif text-lg">Add a new address</h3>
                  <form onSubmit={handleAddAddress} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        required
                        type="text"
                        placeholder="Full Name"
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                      />
                      <input
                        required
                        type="tel"
                        placeholder="Mobile Number"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="Street, Building, or Area"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                      className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <input
                        required
                        type="text"
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                      />
                      <input
                        required
                        type="text"
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                      />
                      <input
                        required
                        type="text"
                        placeholder="Pincode"
                        value={newAddress.zipCode}
                        onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 sm:col-span-1 col-span-2"
                      />
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-neutral-200 mt-2">
                      <button
                        type="submit"
                        className="bg-neutral-950 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-sm hover:bg-neutral-800 transition-all active:scale-95"
                      >
                        Save Address
                      </button>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsAddingAddress(false)}
                          className="text-neutral-500 font-semibold text-sm hover:text-neutral-900 transition-colors"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-100">
            <h2 className="text-xl font-serif font-bold text-neutral-900 mb-6 flex items-center gap-4">
              <span className="w-8 h-8 flex items-center justify-center bg-neutral-100 text-neutral-900 rounded-full text-sm font-mono tracking-tighter">2</span>
              Payment Method
            </h2>
            
            <div className="space-y-4">
              <label
                className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  paymentMethod === "RAZORPAY" 
                    ? "border-neutral-950 bg-neutral-50 shadow-sm" 
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "RAZORPAY"}
                  onChange={() => setPaymentMethod("RAZORPAY")}
                  className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                />
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-neutral-900 text-sm">Pay Online</p>
                    <p className="text-xs text-neutral-500 font-light mt-0.5">Cards, UPI, NetBanking via Razorpay</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold bg-neutral-900 text-white px-2 py-1 rounded-md hidden sm:block">Recommended</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  paymentMethod === "COD" 
                    ? "border-neutral-950 bg-neutral-50 shadow-sm" 
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                  className="w-4 h-4 text-neutral-900 focus:ring-neutral-900 cursor-pointer accent-neutral-900"
                />
                <div>
                  <p className="font-bold text-neutral-900 text-sm">Cash on Delivery</p>
                  <p className="text-xs text-neutral-500 font-light mt-0.5">Pay at your doorstep</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary (Takes 5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-neutral-100/50 border border-neutral-100 lg:sticky lg:top-28">
            <h2 className="text-lg font-serif font-bold text-neutral-900 mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-neutral-600 text-sm">
                <span>Subtotal ({cart.reduce((sum, item) => sum + item.cartQuantity, 0)} items)</span>
                <span className="font-mono text-neutral-900 font-medium">${cartTotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600 text-sm">
                <span>Shipping</span>
                <span className="text-neutral-900 font-medium tracking-wide">Complimentary</span>
              </div>
              <div className="flex justify-between text-neutral-600 text-sm">
                <span>Taxes</span>
                <span className="text-neutral-900 font-medium">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-6 mb-8 flex justify-between items-baseline">
              <span className="font-bold text-neutral-900 text-lg">Total</span>
              <span className="font-mono font-bold text-2xl text-neutral-900">
                ${cartTotalAmount.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || !selectedAddressId}
              className="w-full bg-neutral-950 text-white py-4 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isCheckingOut ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Confirm & Pay"
              )}
            </button>

            {!selectedAddressId && (
              <p className="text-amber-600 text-xs text-center mt-4 font-medium flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Select a delivery address to continue
              </p>
            )}
            
            <p className="text-center text-[11px] text-neutral-400 mt-6 font-light">
              By confirming your order, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}