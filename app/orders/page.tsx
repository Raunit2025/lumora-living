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
    // If a guest tries to access this page, kick them back to the storefront
    if (status === "unauthenticated") {
      window.location.href = "/"; 
      return;
    }

    // If logged in, fetch their specific orders
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-gray-500">
        Loading your order history...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#222222] font-sans">
      
      {/* Simple Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 bg-white border-b border-gray-200">
        <Link href="/" className="text-2xl font-serif tracking-tight font-bold hover:text-gray-600 transition-colors">
          Lunora Living
        </Link>
        <div className="flex gap-6 items-center">
          <span className="text-sm font-medium text-gray-500 hidden sm:block">
            {session?.user?.email}
          </span>
          <Link href="/" className="text-sm font-medium hover:underline">
            Back to Shop
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-3xl font-serif font-bold mb-8">Order History</h1>

        {orders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
            <p className="text-gray-500 mb-6">You haven&apos;t placed any orders yet.</p>
            <Link href="/" className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                
                {/* Order Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-4 sm:p-6 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Order Placed</p>
                    <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Total</p>
                    <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">
                      {order.status}
                    </span>
                  </div>
                  <div className="w-full sm:w-auto text-left sm:text-right text-xs text-gray-400">
                    Order # {order.id.split("-")[0]}
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-4 sm:p-6 space-y-6">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 sm:gap-6">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-md overflow-hidden relative shrink-0 border border-gray-200">
                        {item.product.imageUrl ? (
                          <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg">{item.product.name}</h3>
                        <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                      </div>
                      <div className="font-bold text-base sm:text-lg">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}