"use client";

import { useEffect, useState } from "react";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    name: string; description: string; price: string; stock: string; image: File | null;
  }>({
    name: "", description: "", price: "", stock: "", image: null,
  });
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch Inventory and Orders
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, ordersRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/orders"),
        ]);
        const productsData = await productsRes.json();
        const ordersData = await ordersRes.json();
        setProducts(productsData);
        setOrders(ordersData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    loadData();
  }, [refreshTrigger]);

  // Form Submission Logic
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("description", newProduct.description);
      formData.append("price", newProduct.price);
      formData.append("stock", newProduct.stock);
      if (newProduct.image) {
        formData.append("image", newProduct.image);
      }

      const response = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsModalOpen(false);
        setNewProduct({ name: "", description: "", price: "", stock: "", image: null });
        setRefreshTrigger((prev) => prev + 1); 
      } else {
        alert("Failed to add product");
      }
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Update Order Status Logic
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Pull the trigger to refresh the tables instantly
        setRefreshTrigger((prev) => prev + 1);
      } else {
        alert("Failed to update status.");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Network error updating status.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium tracking-wide">
        Loading Lunora Admin...
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-gray-900 relative">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Lunora Admin</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-black text-white px-4 py-3 sm:py-2 rounded-md hover:bg-gray-800 transition-colors shadow-sm font-medium"
          >
            + Add New Product
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center md:block">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Revenue</h3>
            <p className="text-2xl md:text-3xl font-bold md:mt-2">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center md:block">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Orders</h3>
            <p className="text-2xl md:text-3xl font-bold md:mt-2">{orders.length}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center md:block">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Stock</h3>
            <p className="text-2xl md:text-3xl font-bold md:mt-2">{totalStock}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold">Current Inventory</h2>
            </div>
            <div className="p-4 md:p-6 overflow-x-auto">
              <div className="space-y-4 min-w-75">
                {products.length === 0 ? (
                  <p className="text-gray-500 text-sm">No products in inventory.</p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm md:text-base">{product.name}</p>
                        <p className="text-xs md:text-sm text-gray-500">${product.price.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs md:text-sm font-medium">Stock: {product.stock}</p>
                        <button className="text-xs text-red-500 mt-1 hover:underline">Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
            </div>
            <div className="p-4 md:p-6 overflow-x-auto">
              <div className="space-y-4 min-w-87.5">
                {orders.length === 0 ? (
                  <p className="text-gray-500 text-sm">No recent orders.</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm md:text-base truncate max-w-37.5 md:max-w-none">{order.customerEmail}</p>
                        <p className="text-xs md:text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <p className="font-bold text-sm md:text-base">${order.totalAmount.toFixed(2)}</p>
                        
                        {/* NEW: The Interactive Status Dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className={`text-[10px] md:text-xs rounded-full px-2 py-1 mt-1 font-bold outline-none border cursor-pointer appearance-none text-center
                            ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 border-green-200' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 border-red-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'}`}
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
              <h2 className="text-xl font-bold">Add New Product</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black text-3xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input required type="text" className="w-full border border-gray-300 rounded-md p-3 sm:p-2 focus:ring-black focus:border-black outline-none" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required rows={3} className="w-full border border-gray-300 rounded-md p-3 sm:p-2 focus:ring-black focus:border-black outline-none" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input required type="number" step="0.01" min="0" className="w-full border border-gray-300 rounded-md p-3 sm:p-2 focus:ring-black focus:border-black outline-none" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input required type="number" min="1" className="w-full border border-gray-300 rounded-md p-3 sm:p-2 focus:ring-black focus:border-black outline-none" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <input type="file" accept="image/*" onChange={(e) => setNewProduct({...newProduct, image: e.target.files?.[0] || null})} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800" />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white rounded-md py-4 sm:py-3 mt-6 font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400">
                {isSubmitting ? "Saving..." : "Save Product"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}