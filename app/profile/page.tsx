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
  // NEW: Added phone to the address state
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

      setMessage("Profile updated successfully!");
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#222222] font-sans">
      <nav className="flex justify-between items-center px-8 py-6 bg-white border-b border-gray-200">
        <Link href="/" className="text-2xl font-serif tracking-tight font-bold">
          Lunora Living
        </Link>
        <Link
          href="/"
          className="text-sm font-medium hover:underline text-gray-500 hover:text-black"
        >
          &larr; Back to Shop
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
        <h1 className="text-3xl font-serif font-bold mb-8">My Account</h1>

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-md">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LEFT: Account Details & Password */}
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-6">Account Details</h2>
              <form onSubmit={handleUpdateDetails} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ""}
                    className="w-full border border-gray-300 rounded-md p-3 bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                  />
                </div>

                {/* NEW: Only show Password block if they actually have a password! */}
                {profile?.hasPassword ? (
                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <h3 className="font-semibold mb-4 text-sm text-gray-500 uppercase">
                      Change Password
                    </h3>
                    <div className="space-y-4">
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Current Password"
                        className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                      />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-100 mt-4">
                    <p className="text-sm text-gray-500 italic">
                      You are logged in using Google. Password changes are
                      managed through your Google account.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors mt-4"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Addresses */}
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-6">Saved Addresses</h2>

              {profile?.addresses.length === 0 ? (
                <p className="text-gray-500 text-sm mb-6">
                  You have no saved addresses.
                </p>
              ) : (
                <div className="space-y-4 mb-8">
                  {profile?.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 border rounded-lg relative ${addr.isDefault ? "border-black bg-gray-50" : "border-gray-200"}`}
                    >
                      {addr.isDefault && (
                        <span className="absolute top-4 right-4 text-xs font-bold bg-black text-white px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                      {addr.isDefault && (
                        <span className="absolute top-4 right-4 text-xs font-bold bg-black text-white px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                      <p className="font-bold text-gray-900 mb-1">
                        {addr.name}
                      </p>{" "}
                      {/* <-- NEW: Display Name */}
                      <p className="font-medium">{addr.street}</p>
                      <p className="text-sm text-gray-600">
                        {addr.city}, {addr.state} {addr.zipCode}
                      </p>
                      <p className="text-sm text-gray-600 font-medium mb-4">
                        Phone: {addr.phone}
                      </p>
                      <div className="flex gap-4 text-sm font-medium">
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleMakeDefault(addr.id)}
                            className="text-blue-600 hover:underline"
                          >
                            Make Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 className="font-semibold mb-4 text-sm text-gray-500 uppercase">
                Add New Address
              </h3>
              <form onSubmit={handleAddAddress} className="space-y-4">
                <input
                  required
                  type="text"
                  placeholder="Recipient Name (e.g., Sweta Saxena)"
                  value={newAddress.name}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                />
                <input
                  required
                  type="text"
                  placeholder="Street Address"
                  value={newAddress.street}
                  onChange={(e) =>
                    setNewAddress({ ...newAddress, street: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    type="text"
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, city: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                  />
                  <input
                    required
                    type="text"
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, state: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    required
                    type="text"
                    placeholder="Postal / Zip Code"
                    value={newAddress.zipCode}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, zipCode: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Delivery Phone"
                    value={newAddress.phone}
                    onChange={(e) =>
                      setNewAddress({ ...newAddress, phone: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md p-3 focus:border-black outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full border border-black text-black py-3 rounded-md font-medium hover:bg-black hover:text-white transition-colors"
                >
                  Add Address
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
