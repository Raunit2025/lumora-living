"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const { data: session } = useSession();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  // NEW: Auth Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 1. Fetch the specific product data
  useEffect(() => {
    if (!params?.id) return;

    fetch(`/api/products/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [params?.id]);

  // 2. The Authentication Engine
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to sign up");
        }
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error("Invalid email or password");
      } else {
        setIsAuthModalOpen(false);
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError("An unexpected error occurred");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // 3. Add to Cart Logic
  const handleAddToCart = async () => {
    // UPDATED: No more alerts! Just open the modal.
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product?.id, quantity: 1 }),
      });

      if (res.ok) {
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">Loading details...</div>;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA]">
        <h1 className="text-2xl font-bold mb-4">Product not found.</h1>
        <Link href="/" className="text-blue-600 hover:underline">Return to Shop</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#222222] font-sans relative">
      
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 bg-white border-b border-gray-200">
        <Link href="/" className="text-2xl font-serif tracking-tight font-bold">Lunora Living</Link>
        <div className="flex gap-6 items-center">
          {session && (
            <span className="text-sm font-medium text-gray-500 hidden sm:block">
              {session.user?.email}
            </span>
          )}
          <Link href="/" className="text-sm font-medium hover:underline text-gray-500 hover:text-black">
            &larr; Back to Shop
          </Link>
        </div>
      </nav>

      {/* Main Product Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          <div className="w-full aspect-square sm:aspect-4/5 bg-gray-200 rounded-2xl overflow-hidden relative shadow-sm">
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="absolute inset-0 bg-linear-to-tr from-gray-200 to-gray-100" />
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-6 flex gap-3">
              {product.stock > 0 && product.stock <= 10 && (
                <span className="bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Only {product.stock} left
                </span>
              )}
              {product.stock === 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Sold Out
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl font-serif font-bold leading-tight mb-4 text-gray-900">
              {product.name}
            </h1>
            
            <p className="text-2xl font-bold mb-8 text-gray-800">
              ${product.price.toFixed(2)}
            </p>
            
            <div className="prose prose-gray mb-10 text-gray-600 leading-relaxed">
              <p>{product.description}</p>
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-8 mt-auto">
              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0 || isAddingToCart}
                className="w-full bg-black text-white py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md"
              >
                {isAddingToCart ? "Adding..." : (product.stock === 0 ? "Out of Stock" : "Add to cart")}
              </button>

              {cartSuccess && (
                <div className="text-center text-green-600 font-medium animate-in fade-in slide-in-from-bottom-2">
                  ✓ Added to your persistent cart!
                </div>
              )}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-gray-500 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-2"><span>📦</span> Secure Packaging</div>
              <div className="flex items-center gap-2"><span>✨</span> Artisan Crafted</div>
            </div>
          </div>
        </div>
      </main>

      {/* AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsAuthModalOpen(false); setAuthError(""); }} />
          <div className="relative bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => { setIsAuthModalOpen(false); setAuthError(""); }} className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl">&times;</button>
            
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold mb-2">
                {authMode === "login" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-gray-500 text-sm">
                Log in to add this item to your cart.
              </p>
            </div>

            <button 
              onClick={() => signIn("google")}
              type="button"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors mb-6"
            >
              <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute border-t border-gray-200 w-full"></div>
              <span className="relative bg-white px-4 text-xs text-gray-500 uppercase font-medium">Or</span>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && (
                <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md border border-red-100 text-center">
                  {authError}
                </div>
              )}

              <input 
                type="email" 
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none text-gray-900" 
                required 
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none text-gray-900" 
                required 
                minLength={6}
              />
              
              <button 
                type="submit" 
                disabled={isAuthLoading}
                className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors mt-2 disabled:bg-gray-400"
              >
                {isAuthLoading ? "Please wait..." : (authMode === "login" ? "Log In" : "Sign Up")}
              </button>
            </form>

            <p className="text-center mt-6 text-sm text-gray-500">
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }} 
                className="text-black font-semibold hover:underline"
              >
                {authMode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}