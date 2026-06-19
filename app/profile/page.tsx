"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

// --- STRICT TYPES ---
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

interface UserProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  hasPassword?: boolean;
  addresses: Address[];
}

export default function ProfilePage() {
  const { status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [phone, setPhone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newAddress, setNewAddress] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
  });

  // UI Feedback States
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setProfile(data);
      setPhone(data.phone || "");
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/";
      return;
    }
    if (status === "authenticated") {
      setTimeout(() => {
        fetchProfile();
      }, 0);
    }
  }, [status, fetchProfile]);

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setMessage("Profile updated successfully");
      setOldPassword("");
      setNewPassword("");
      fetchProfile();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });
      if (!res.ok) throw new Error("Failed to add address");

      setNewAddress({
        name: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        phone: "",
      });
      fetchProfile();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unexpected error occurred");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId }),
      });
      fetchProfile();
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  const handleMakeDefault = async (addressId: string) => {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId }),
      });
      fetchProfile();
    } catch (err) {
      console.error("Failed to update default address:", err);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#FBFBF9] text-gray-800 font-sans">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans antialiased selection:bg-neutral-200 pb-24">
      
      {/* MINIMALIST GLASS NAVBAR */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-5 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40 transition-all duration-200">
        <Link href="/" className="font-serif font-black text-xl tracking-tight hover:opacity-80 transition-opacity">
          Lumora Living
        </Link>
        <Link href="/" className="text-sm font-medium text-neutral-600 hover:text-black transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 hover:after:w-full after:bg-black after:transition-all">
          Back to Shop
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 mt-12 sm:mt-16">
        
        {/* HEADER SECTION */}
        <div className="mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-900 tracking-tight">Account Details</h1>
            <p className="text-neutral-500 mt-2 font-light text-sm sm:text-base">Manage your personal information and delivery preferences.</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center font-serif font-bold text-xl text-neutral-600">
               {profile?.email?.[0].toUpperCase() || "U"}
             </div>
             <div>
               <p className="font-bold text-sm text-neutral-900">{profile?.name || "Client"}</p>
               <p className="text-xs text-neutral-400 font-mono">{profile?.email}</p>
             </div>
          </div>
        </div>

        {/* FEEDBACK MESSAGES */}
        {message && (
          <div className="mb-8 p-4 bg-green-50/80 text-green-700 border border-green-200/60 rounded-2xl text-sm font-medium flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {message}
          </div>
        )}
        {error && (
          <div className="mb-8 p-4 bg-red-50/80 text-red-700 border border-red-200/60 rounded-2xl text-sm font-medium flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: Account Details & Password (Takes 5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-6 sm:p-8 border border-neutral-100 rounded-3xl shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900 mb-6 font-serif tracking-tight">Personal Information</h2>
              <form onSubmit={handleUpdateDetails} className="space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3.5 text-sm text-neutral-400 cursor-not-allowed outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-300 font-mono"
                  />
                </div>

                {profile?.hasPassword ? (
                  <div className="pt-6 mt-6 border-t border-neutral-100 space-y-5">
                    <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Security</h3>
                    <div className="space-y-4">
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Current Password"
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                      />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-6 mt-6 border-t border-neutral-100 flex gap-4 p-4 bg-neutral-50 rounded-2xl">
                    <span className="text-2xl opacity-50">🔒</span>
                    <p className="text-xs text-neutral-500 font-light leading-relaxed">
                      You authenticated via Google. Password management is handled externally through your Google account settings.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-neutral-950 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.98] mt-4"
                >
                  Update Profile
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Addresses (Takes 7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-6 sm:p-8 border border-neutral-100 rounded-3xl shadow-sm">
              <h2 className="text-lg font-bold text-neutral-900 mb-6 font-serif tracking-tight">Delivery Locations</h2>

              {profile?.addresses.length === 0 ? (
                <div className="bg-neutral-50/50 p-8 rounded-2xl border border-neutral-100 border-dashed text-center mb-10">
                  <span className="text-3xl opacity-40 mb-4 block">📍</span>
                  <p className="text-neutral-500 text-sm font-light">You have no saved addresses yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  {profile?.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-5 rounded-2xl relative transition-all duration-200 border ${
                        addr.isDefault 
                          ? "border-neutral-950 bg-neutral-50 shadow-sm" 
                          : "border-neutral-200 hover:border-neutral-300 bg-white"
                      }`}
                    >
                      {addr.isDefault && (
                        <span className="absolute top-5 right-5 text-[9px] uppercase tracking-widest font-bold bg-neutral-900 text-white px-2 py-1 rounded-md">
                          Default
                        </span>
                      )}
                      
                      <div className="pr-16">
                        <p className="font-bold text-neutral-900 text-sm mb-1 line-clamp-1">{addr.name}</p>
                        <p className="text-neutral-600 text-sm font-light leading-relaxed">{addr.street}</p>
                        <p className="text-neutral-600 text-xs font-light mt-0.5">
                          {addr.city}, {addr.state} — <span className="font-medium text-neutral-800">{addr.zipCode}</span>
                        </p>
                        <p className="text-neutral-400 text-xs mt-3 font-mono">{addr.phone}</p>
                      </div>

                      <div className="flex gap-4 text-xs font-semibold mt-5 pt-4 border-t border-neutral-200/60">
                        {!addr.isDefault && (
                          <button onClick={() => handleMakeDefault(addr.id)} className="text-neutral-900 hover:text-neutral-500 transition-colors">
                            Set as Default
                          </button>
                        )}
                        <button onClick={() => handleDeleteAddress(addr.id)} className="text-red-500 hover:text-red-700 transition-colors ml-auto">
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Address Form */}
              <div className="pt-6 border-t border-neutral-100">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-5">Add a new destination</h3>
                <form onSubmit={handleAddAddress} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input
                      required
                      type="text"
                      placeholder="Recipient Name (e.g., Jane Doe)"
                      value={newAddress.name}
                      onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                      className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                    />
                    <input
                      required
                      type="tel"
                      placeholder="Delivery Phone"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 font-mono"
                    />
                  </div>

                  <input
                    required
                    type="text"
                    placeholder="Street Address, Building, or Area"
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
                      placeholder="Zip Code"
                      value={newAddress.zipCode}
                      onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                      className="w-full border border-neutral-200 bg-white rounded-xl p-3.5 text-sm focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400 sm:col-span-1 col-span-2 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-white border border-neutral-200 text-neutral-900 py-3.5 rounded-xl text-sm font-semibold hover:border-neutral-900 hover:bg-neutral-50 transition-all shadow-sm active:scale-[0.98] mt-2"
                  >
                    Save Address
                  </button>
                </form>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}