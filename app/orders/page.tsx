"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/"; 
      return;
    }
    if (status === "authenticated") {
      fetch("/api/orders/me")
        .then((res) => res.json())
        .then((data) => {
          setOrders(data);
          setLoading(false);
        })
        .catch((err) => console.error("Error:", err));
    }
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#FBFBF9] text-gray-800 font-sans">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans antialiased selection:bg-neutral-200 pb-24">
      <nav className="flex justify-between items-center px-6 sm:px-12 py-5 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40 transition-all duration-200">
        <Link href="/" className="font-serif font-black text-xl tracking-tight hover:opacity-80 transition-opacity">
          Lumora Living
        </Link>
        <div className="flex gap-4 sm:gap-8 items-center">
          <span className="text-xs font-medium text-neutral-400 hidden sm:block">
            {session?.user?.email}
          </span>
          <Link href="/" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 hover:after:w-full after:bg-black after:transition-all">
            Back to Shop
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 mt-12 sm:mt-16">
        <div className="mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 tracking-tight">Order History</h1>
          <p className="text-neutral-500 mt-2 font-light text-sm sm:text-base">Review your past collections and acquisitions.</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-12 sm:p-20 text-center rounded-3xl border border-neutral-100 shadow-sm flex flex-col items-center">
            <span className="text-4xl mb-6 opacity-30">📦</span>
            <h2 className="text-xl font-serif font-bold text-neutral-900 mb-2">No orders found</h2>
            <p className="text-neutral-500 mb-8 font-light text-sm">You haven&apos;t placed any orders with us yet.</p>
            <Link href="/" className="bg-neutral-950 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.98]">
              Explore the Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-8 sm:space-y-10">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                
                <div className="bg-neutral-50/80 border-b border-neutral-100 p-5 sm:p-7 flex flex-wrap justify-between items-start sm:items-center gap-6 sm:gap-4">
                  <div className="flex flex-wrap gap-8 sm:gap-12 w-full sm:w-auto">
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest mb-1.5">Date Placed</p>
                      <p className="font-medium text-neutral-900 text-sm">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest mb-1.5">Total Amount</p>
                      <p className="font-mono font-bold text-neutral-900 text-sm">${order.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t border-neutral-200/60 sm:border-t-0 pt-4 sm:pt-0">
                    <div className="flex flex-col sm:items-end mr-4">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest mb-1.5">Status</p>
                      <span className={`inline-block px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-md font-bold border ${
                        order.status.toLowerCase() === 'delivered' ? 'bg-green-50 text-green-700 border-green-200/60'
                        : order.status.toLowerCase() === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200/60'
                        : order.status.toLowerCase() === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-200/60'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    {/* NEW VIEW DETAILS BUTTON */}
                    <Link href={`/orders/${order.id}`} className="bg-white border border-neutral-200 hover:border-neutral-900 text-neutral-900 text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm">
                      View Details
                    </Link>
                  </div>
                </div>

                <div className="p-5 sm:p-7 space-y-6">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-5 sm:gap-8">
                      <div className="w-16 h-20 sm:w-20 sm:h-24 bg-neutral-50 rounded-xl overflow-hidden relative shrink-0 border border-neutral-100">
                        {item.product.imageUrl ? (
                          <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-linear-to-tr from-neutral-200 to-neutral-50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-bold text-base sm:text-lg text-neutral-900 truncate">
                          {item.product.name}
                        </h3>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1 font-light">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-sm text-neutral-500 font-medium pl-2 pt-2 border-t border-neutral-100">
                      + {order.items.length - 2} more items in this order
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}