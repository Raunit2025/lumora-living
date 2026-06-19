"use client";

import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

// 1. Data Interfaces
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

interface Order {
  id: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export default function AdminPortal() {
  // --- SECURITY STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // --- DATA STATES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<{
    name: string;
    description: string;
    price: string;
    stock: string;
    image: File | null;
  }>({
    name: "",
    description: "",
    price: "",
    stock: "",
    image: null,
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Check Session Storage on Mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem("lunoraAdminAuth") === "true";
    setTimeout(() => {
      if (isAuth) {
        setIsAuthenticated(true);
      }
      setIsAuthChecking(false);
    }, 0);
  }, []);

  // 2. Fetch Inventory and Orders
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/orders"),
        ]);
        const productsData = await productsRes.json();
        const ordersData = await ordersRes.json();

        setProducts(Array.isArray(productsData) ? productsData : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [refreshTrigger, isAuthenticated]);

  // 3. Login Logic
  const handleAdminLogin = () => {
    if (adminPassword.trim() === "sweta123") {
      sessionStorage.setItem("lunoraAdminAuth", "true");
      setIsAuthenticated(true);
    } else {
      toast.error("Incorrect admin credential.");
      setAdminPassword("");
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("lunoraAdminAuth");
    setIsAuthenticated(false);
    setAdminPassword("");
  };

  // Form Submission Logic
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProductId) {
        const response = await fetch(`/api/products/${editingProductId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newProduct.name,
            description: newProduct.description,
            price: parseFloat(newProduct.price),
            stock: parseInt(newProduct.stock, 10),
          }),
        });

        if (response.ok) {
          setIsModalOpen(false);
          setEditingProductId(null);
          setNewProduct({
            name: "",
            description: "",
            price: "",
            stock: "",
            image: null,
          });
          setRefreshTrigger((prev) => prev + 1);
          toast.success("Product updated securely.");
        } else toast.error("Failed to update product");
      } else {
        const formData = new FormData();
        formData.append("name", newProduct.name);
        formData.append("description", newProduct.description);
        formData.append("price", newProduct.price);
        formData.append("stock", newProduct.stock);
        if (newProduct.image) formData.append("image", newProduct.image);

        const response = await fetch("/api/products", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          setIsModalOpen(false);
          setNewProduct({
            name: "",
            description: "",
            price: "",
            stock: "",
            image: null,
          });
          setRefreshTrigger((prev) => prev + 1);
          toast.success("New product deployed.");
        } else toast.error("Failed to add product");
      }
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      image: null,
    });
    setIsModalOpen(true);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        setRefreshTrigger((prev) => prev + 1);
        toast.success("Order status updated.");
      } else toast.error("Failed to update status.");
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // --- RENDER 1: BLANK SCREEN WHILE CHECKING SESSION ---
  if (isAuthChecking) {
    return <div className="min-h-screen bg-[#FAFAFA]" />;
  }

  // --- RENDER 2: THE SECURE LOCK SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans flex items-center justify-center p-4 antialiased selection:bg-neutral-200">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#171717",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
            },
          }}
        />
        <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-neutral-100 w-full max-w-sm animate-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold tracking-tight text-neutral-900">
              Command Center
            </h1>
            <p className="text-sm text-neutral-400 mt-2 font-light">
              Authorized personnel only.
            </p>
          </div>

          <div className="space-y-5">
            <input
              type="password"
              placeholder="Enter Master Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 text-center tracking-widest"
            />
            <button
              type="button"
              onClick={handleAdminLogin}
              className="w-full bg-neutral-950 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.98]"
            >
              Unlock Terminal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER 3: LOADING DASHBOARD DATA ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#FBFBF9] text-gray-800 font-sans">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold animate-pulse">
          Decrypting Datasets
        </span>
      </div>
    );
  }

  // --- RENDER 4: THE FULL ADMIN DASHBOARD ---
  const totalRevenue = orders.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans antialiased selection:bg-neutral-200 relative pb-24">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#171717",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
          },
        }}
      />

      {/* MINIMALIST GLASS NAVBAR */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-5 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40 transition-all duration-200">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <h1 className="font-serif font-black text-xl tracking-tight text-neutral-900">
            Lumora Admin
          </h1>
        </div>
        <button
          onClick={handleAdminLogout}
          className="text-xs sm:text-sm font-semibold text-neutral-400 hover:text-red-500 transition-colors"
        >
          Terminate Session
        </button>
      </nav>

      <main className="max-w-350 mx-auto px-4 sm:px-8 lg:px-12 mt-10 sm:mt-14 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 tracking-tight">
              Overview
            </h2>
            <p className="text-neutral-500 mt-1 font-light text-sm">
              Real-time metrics and operational status.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingProductId(null);
              setNewProduct({
                name: "",
                description: "",
                price: "",
                stock: "",
                image: null,
              });
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-800 text-white px-6 py-3.5 rounded-xl transition-all shadow-sm font-semibold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>+</span> Deploy New Product
          </button>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
              Gross Revenue
            </h3>
            <p className="text-4xl font-mono font-bold text-neutral-900">
              ${totalRevenue.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
              Total Orders
            </h3>
            <p className="text-4xl font-mono font-bold text-neutral-900">
              {orders.length}
            </p>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
              Active Inventory
            </h3>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-mono font-bold text-neutral-900">
                {totalStock}
              </p>
              <span className="text-neutral-400 text-sm font-light">units</span>
            </div>
          </div>
        </div>

        {/* DATABASES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* INVENTORY PANEL */}
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col h-150">
            <div className="p-6 sm:p-8 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-serif font-bold text-neutral-900">
                Inventory Management
              </h2>
              <span className="bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono">
                {products.length} items
              </span>
            </div>

            <div className="overflow-y-auto p-2 sm:p-4 flex-1 custom-scrollbar">
              {products.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                  <span className="text-3xl mb-3 opacity-30">📦</span>
                  <p className="text-sm font-light">Database empty.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="group flex justify-between items-center p-4 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-100"
                    >
                      <div>
                        <p className="font-bold text-neutral-900 text-sm">
                          {product.name}
                        </p>
                        <p className="text-xs text-neutral-500 font-mono mt-0.5">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${product.stock > 5 ? "bg-neutral-100 text-neutral-600" : "bg-red-50 text-red-600 border border-red-100"}`}
                        >
                          {product.stock} in stock
                        </span>
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-[11px] text-neutral-400 hover:text-neutral-900 font-semibold transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Edit / Restock &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ORDERS PANEL */}
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col h-150">
            <div className="p-6 sm:p-8 border-b border-neutral-100 bg-neutral-50/50 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-serif font-bold text-neutral-900">
                Order Fulfilment
              </h2>
              <span className="bg-neutral-200 text-neutral-700 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono">
                Live Feed
              </span>
            </div>

            <div className="overflow-y-auto p-2 sm:p-4 flex-1 custom-scrollbar">
              {orders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                  <span className="text-3xl mb-3 opacity-30">📡</span>
                  <p className="text-sm font-light">Awaiting transmissions.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-100 gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-900 text-sm truncate">
                          {order.customerEmail}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[10px] text-neutral-400 font-mono uppercase">
                            #{order.id.split("-")[0]}
                          </p>
                          <span className="w-1 h-1 bg-neutral-200 rounded-full" />
                          <p className="text-xs text-neutral-500 font-light">
                            {new Date(order.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2">
                        <p className="font-mono font-bold text-neutral-900 text-sm">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className={`text-[10px] rounded-md px-2 py-1 font-bold outline-none border cursor-pointer appearance-none text-center tracking-widest uppercase shadow-xs transition-colors
                            ${
                              order.status === "PENDING"
                                ? "bg-neutral-100 text-neutral-700 border-neutral-200/60"
                                : order.status === "SHIPPED"
                                  ? "bg-blue-50 text-blue-700 border-blue-200/60"
                                  : order.status === "DELIVERED"
                                    ? "bg-green-50 text-green-700 border-green-200/60"
                                    : order.status === "PROCESSING"
                                      ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                      : order.status === "CANCELLED"
                                        ? "bg-red-50 text-red-700 border-red-200/60"
                                        : "bg-neutral-50 text-neutral-800 border-neutral-200"
                            }`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* EDIT / ADD PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 transition-opacity">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-neutral-100 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-neutral-100">
              <h2 className="text-xl font-serif font-bold text-neutral-900">
                {editingProductId ? "Modify Database" : "Deploy Product"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProductId(null);
                }}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-full hover:bg-neutral-50 transition-all text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                  Asset Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 resize-none"
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                    Unit Price ($)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 font-mono"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                    Stock Level
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 font-mono"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, stock: e.target.value })
                    }
                  />
                </div>
              </div>

              {!editingProductId && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
                    Visual Asset
                  </label>
                  <div className="border border-neutral-200 border-dashed rounded-xl p-1 bg-neutral-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          image: e.target.files?.[0] || null,
                        })
                      }
                      className="w-full text-sm text-neutral-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800 file:cursor-pointer file:transition-colors cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-neutral-950 text-white rounded-xl py-4 sm:py-3.5 mt-6 text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.98] disabled:bg-neutral-300 disabled:cursor-not-allowed flex justify-center items-center h-12"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : editingProductId ? (
                  "Commit Changes"
                ) : (
                  "Initialize Product"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
