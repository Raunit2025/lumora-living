"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

// Types
interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
}
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: Product;
}
interface Order {
  id: string;
  totalAmount: number;
  status: string;
  shippingAddress: string | null;
  paymentMethod: string;
  paymentId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the Promise in Next.js 15
  const resolvedParams = use(params);
  
  // FIX 1: Removed the unused 'session' variable
  const { status: authStatus } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      window.location.href = "/";
      return;
    }

    if (authStatus === "authenticated") {
      fetch(`/api/orders/${resolvedParams.id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          setOrder(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [authStatus, resolvedParams.id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to ${newStatus === 'CANCELLED' ? 'cancel' : 'request a refund for'} this order?`)) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        toast.success(`Order has been ${newStatus.toLowerCase()} successfully.`);
        setOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      } else {
        toast.error("Failed to update the order. Please contact support.");
      }
    } catch (err) {
      // FIX 2: Logged the 'err' to the console so it is no longer unused
      console.error("Status update error:", err);
      toast.error("A network error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading || authStatus === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9]">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] gap-4">
        <h1 className="text-2xl font-serif font-bold">Order Not Found</h1>
        <Link href="/orders" className="text-sm font-medium hover:underline">Return to Orders</Link>
      </div>
    );
  }

  // Parse Address safely
  const addressParts = order.shippingAddress ? order.shippingAddress.split(" | ") : ["No Name/Phone", "No Address provided"];

  // Simple Status Tracker Logic
  const getStatusStep = () => {
    const s = order.status.toUpperCase();
    if (s === 'CANCELLED') return -1;
    if (s === 'PENDING') return 1;
    if (s === 'PROCESSING') return 2;
    if (s === 'SHIPPED') return 3;
    if (s === 'DELIVERED') return 4;
    return 1;
  };
  const step = getStatusStep();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans antialiased selection:bg-neutral-200 pb-24">
      <Toaster position="top-center" toastOptions={{ style: { background: '#171717', color: '#fff', borderRadius: '12px', fontSize: '14px' } }} />

      <nav className="flex items-center px-6 sm:px-12 py-5 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40">
        <Link href="/orders" className="text-sm font-medium text-neutral-500 hover:text-black transition-colors flex items-center gap-2">
          &larr; Back to all orders
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* LEFT COLUMN: Items & Tracker */}
        <div className="lg:col-span-8 space-y-8">
          
          <div className="mb-4">
            <h1 className="text-3xl font-serif font-bold text-neutral-900">Order Details</h1>
            <p className="text-neutral-500 font-mono mt-1 text-sm">#{order.id}</p>
            <p className="text-neutral-400 text-xs mt-1">Placed on {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {/* STATUS TRACKER */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-100">
             <h2 className="text-base font-bold text-neutral-900 mb-8 uppercase tracking-widest text-[11px]">Delivery Status</h2>
             
             {step === -1 ? (
               <div className="flex items-center gap-4 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                 <span className="text-2xl">❌</span>
                 <div>
                   <p className="font-bold text-sm">Order Cancelled</p>
                   <p className="text-xs text-red-500 mt-1">This order was cancelled and will not be shipped.</p>
                 </div>
               </div>
             ) : (
               <div className="relative flex justify-between items-center">
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-neutral-100 rounded-full z-0" />
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-green-500 rounded-full z-0 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }} />
                 
                 {["Placed", "Processing", "Shipped", "Delivered"].map((label, idx) => (
                   <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${step > idx ? 'bg-green-500 border-green-500 text-white' : step === idx + 1 ? 'bg-white border-green-500 text-green-500' : 'bg-white border-neutral-200 text-neutral-300'}`}>
                       {step > idx ? "✓" : idx + 1}
                     </div>
                     <span className={`text-[10px] sm:text-xs font-semibold ${step >= idx + 1 ? 'text-neutral-900' : 'text-neutral-400'}`}>{label}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>

          {/* ITEMS LIST */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-neutral-100">
            <h2 className="text-base font-bold text-neutral-900 mb-6 uppercase tracking-widest text-[11px]">Items Ordered</h2>
            <div className="space-y-6">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-5 sm:gap-6 border-b border-neutral-100/60 pb-6 last:border-0 last:pb-0">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 bg-neutral-50 rounded-xl overflow-hidden relative shrink-0 border border-neutral-100">
                    {item.product.imageUrl ? (
                      <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-linear-to-tr from-neutral-200 to-neutral-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.product.id}`}>
                      <h3 className="font-serif font-bold text-base sm:text-lg text-neutral-900 hover:underline truncate">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-neutral-500 text-xs sm:text-sm mt-1 font-light">Price: ₹{(item.price).toFixed(2)}</p>
                    <p className="text-neutral-500 text-xs sm:text-sm font-light">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-mono font-bold text-neutral-900 text-base sm:text-lg">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Info & Actions */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
            <h2 className="text-base font-bold text-neutral-900 mb-4 uppercase tracking-widest text-[11px]">Shipping Details</h2>
            <p className="font-medium text-neutral-900 text-sm mb-1">{addressParts[0]}</p>
            <p className="text-neutral-500 text-sm font-light leading-relaxed">{addressParts[1]}</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
            <h2 className="text-base font-bold text-neutral-900 mb-4 uppercase tracking-widest text-[11px]">Payment Summary</h2>
            <div className="space-y-3 text-sm text-neutral-600 mb-4">
              <div className="flex justify-between">
                <span>Method</span>
                <span className="font-medium text-neutral-900">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}</span>
              </div>
              {order.paymentId && (
                <div className="flex justify-between">
                  <span>Txn ID</span>
                  <span className="font-mono text-xs">{order.paymentId.substring(0, 12)}...</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-medium text-neutral-900">Complimentary</span>
              </div>
            </div>
            <div className="border-t border-neutral-100 pt-4 flex justify-between items-baseline">
              <span className="font-bold text-neutral-900">Total</span>
              <span className="font-mono font-bold text-xl text-neutral-900">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col gap-3">
             <h2 className="text-base font-bold text-neutral-900 mb-2 uppercase tracking-widest text-[11px]">Actions</h2>
             
             {step !== -1 && step < 3 && (
               <button 
                 onClick={() => handleUpdateStatus('CANCELLED')}
                 disabled={isUpdating}
                 className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
               >
                 Cancel Order
               </button>
             )}

             {step === 4 && (
                <button 
                onClick={() => handleUpdateStatus('REFUND_REQUESTED')}
                disabled={isUpdating}
                className="w-full bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                Request Return / Refund
              </button>
             )}

             <Link href="/" className="w-full text-center bg-neutral-950 text-white py-3 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm">
                Continue Shopping
             </Link>
          </div>

        </div>
      </main>
    </div>
  );
}