"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

// --- STRICT TYPES ---
interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  reviews: Review[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const { data: session } = useSession();

  // Extract the ID safely
  const productId = typeof params?.id === "string" ? params.id : undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  // Review States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Auth Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const fetchProduct = useCallback(() => {
    if (!productId) return;
    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Auth Engine
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

      const result = await signIn("credentials", { redirect: false, email, password });
      if (result?.error) throw new Error("Invalid email or password");
      
      setIsAuthModalOpen(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      if (err instanceof Error) setAuthError(err.message);
      else setAuthError("An unexpected error occurred");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsAddingToCart(true);
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product?.id, quantity: 1 }),
    });
    if (res.ok) {
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    }
    setIsAddingToCart(false);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSubmittingReview(true);

    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product?.id, rating, comment }),
    });

    setComment("");
    setRating(5);
    setIsSubmittingReview(false);
    fetchProduct();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#FBFBF9] text-gray-800 font-sans">
      <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-neutral-500">Product not found.</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans relative antialiased selection:bg-neutral-200">
      
      {/* MINIMALIST GLASS NAVBAR */}
      <nav className="flex justify-between items-center px-6 sm:px-12 py-5 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40">
        <Link href="/" className="font-serif font-black text-xl tracking-tight hover:opacity-80 transition-opacity">
          Lumora Living
        </Link>
        <Link href="/" className="text-sm font-medium text-neutral-500 hover:text-black transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 hover:after:w-full after:bg-black after:transition-all">
          &larr; Back to Shop
        </Link>
      </nav>

      <main className="max-w-350 mx-auto px-4 sm:px-8 lg:px-12 py-12 lg:py-20">
        
        {/* ASYMMETRIC PRODUCT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start mb-24">
          
          {/* LEFT COL: Expansive Image (Takes 7 columns out of 12) */}
          <div className="lg:col-span-7 w-full">
            <div className="w-full aspect-4/5 sm:aspect-square lg:aspect-4/5 bg-neutral-100 relative rounded-3xl overflow-hidden shadow-inner border border-neutral-100/50">
              {product.imageUrl ? (
                <Image src={product.imageUrl} alt={product.name} fill className="object-cover" priority />
              ) : (
                <div className="absolute inset-0 bg-linear-to-tr from-neutral-200 to-neutral-50" />
              )}
            </div>
          </div>

          {/* RIGHT COL: Sticky Details (Takes 5 columns out of 12) */}
          <div className="lg:col-span-5 flex flex-col justify-center lg:sticky lg:top-32">
            
            {/* Breadcrumb & Badges */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold tracking-widest uppercase text-neutral-400">Home / Shop</span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse">
                  Only {product.stock} left
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold mb-4 tracking-tight leading-[1.1] text-neutral-900">
              {product.name}
            </h1>
            
            <p className="text-2xl font-mono font-bold text-neutral-800 mb-8 pb-8 border-b border-neutral-100">
              ${product.price.toFixed(2)}
            </p>
            
            <p className="text-base text-neutral-500 mb-10 leading-relaxed font-light">
              {product.description}
            </p>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isAddingToCart}
              className={`w-full py-4 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm active:scale-[0.98] ${
                cartSuccess 
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20" 
                  : "bg-neutral-950 hover:bg-neutral-800 text-white"
              } disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed`}
            >
              {product.stock === 0 
                ? "Out of Stock" 
                : cartSuccess 
                  ? "✓ Added to Bag" 
                  : isAddingToCart 
                    ? "Adding..." 
                    : "Add to Bag"}
            </button>

            {/* Static Trust/Detail Items to fill space beautifully */}
            <div className="mt-12 space-y-4 pt-8 border-t border-neutral-100">
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span className="text-xl">✨</span>
                <span className="font-medium">Handcrafted with intention</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span className="text-xl">📦</span>
                <span className="font-medium">Ships within 2-3 business days</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-neutral-600">
                <span className="text-xl">🌿</span>
                <span className="font-medium">Sustainable & minimal packaging</span>
              </div>
            </div>
          </div>
        </div>

        {/* FULL-WIDTH REVIEWS SECTION */}
        <div className="border-t border-neutral-200 pt-20">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-serif font-bold text-neutral-900 tracking-tight">Customer Reflections</h2>
              <p className="text-neutral-500 mt-2 font-light">Thoughts from the Lumora Living community.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            
            {/* WRITE REVIEW PANEL */}
            <div className="lg:col-span-4 lg:sticky lg:top-32">
              <div className="bg-white p-8 border border-neutral-100 rounded-3xl shadow-xl shadow-neutral-100/50">
                <h3 className="font-bold text-lg mb-6 font-serif tracking-tight">Share your experience</h3>
                {session ? (
                  <form onSubmit={handleAddReview} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Rating</label>
                      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full p-3.5 border border-neutral-200 bg-neutral-50 hover:bg-white rounded-xl outline-none focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 transition-all cursor-pointer">
                        <option value="5">⭐⭐⭐⭐⭐ - Perfect</option>
                        <option value="4">⭐⭐⭐⭐ - Beautiful</option>
                        <option value="3">⭐⭐⭐ - Good</option>
                        <option value="2">⭐⭐ - Average</option>
                        <option value="1">⭐ - Disappointing</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Your Thoughts</label>
                      <textarea required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How does this fit into your home?" rows={4} className="w-full p-4 border border-neutral-200 bg-neutral-50 hover:bg-white rounded-xl outline-none focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 transition-all resize-none placeholder:text-neutral-400" />
                    </div>
                    <button type="submit" disabled={isSubmittingReview} className="w-full bg-neutral-950 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50">
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                ) : (
                  <div className="bg-neutral-50/50 p-8 rounded-2xl border border-neutral-100 text-center flex flex-col items-center gap-4">
                    <span className="text-2xl opacity-50">✍️</span>
                    <p className="text-sm text-neutral-500 font-light">You must be logged in to leave a review.</p>
                    <button onClick={() => setIsAuthModalOpen(true)} className="text-sm font-semibold bg-white border border-neutral-200 px-6 py-2.5 rounded-full hover:border-neutral-900 transition-colors shadow-2xs">Log In</button>
                  </div>
                )}
              </div>
            </div>

            {/* REVIEW FEED */}
            <div className="lg:col-span-8 space-y-6">
              {product.reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-neutral-50/50 rounded-3xl border border-neutral-100 border-dashed">
                  <span className="text-3xl mb-4 opacity-40">🪴</span>
                  <p className="text-neutral-500 font-light text-lg">No reflections yet.</p>
                  <p className="text-neutral-400 text-sm">Be the first to share how this feels in your space.</p>
                </div>
              ) : (
                product.reviews.map((rev: Review) => (
                  <div key={rev.id} className="bg-white p-8 border border-neutral-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-500 font-bold font-serif text-lg">
                          {(rev.user.name || rev.user.email || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 text-sm">{rev.user.name || rev.user.email?.split("@")[0]}</p>
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">{new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                      <span className="text-amber-500 tracking-widest text-sm drop-shadow-xs">
                        {"★".repeat(rev.rating)}<span className="text-neutral-200">{"★".repeat(5 - rev.rating)}</span>
                      </span>
                    </div>
                    <p className="text-neutral-600 leading-relaxed font-light mt-4 pl-13 text-sm sm:text-base">
                      &quot;{rev.comment}&quot;
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* RESTORED PREMIUM AUTH MODAL (Exact match from Landing Page) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-md transition-opacity duration-300" onClick={() => { setIsAuthModalOpen(false); setAuthError(""); }} />
          <div className="relative bg-white w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-200 ease-out">
            <button onClick={() => { setIsAuthModalOpen(false); setAuthError(""); }} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 p-1.5 rounded-full hover:bg-neutral-50 transition-all text-xl">&times;</button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-1.5">{authMode === "login" ? "Welcome back" : "Create an account"}</h2>
              <p className="text-neutral-500 text-sm font-light">{authMode === "login" ? "Log in to continue shopping." : "Join Lumora Living today."}</p>
            </div>
            <button onClick={() => signIn("google")} type="button" className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-200 hover:border-neutral-300 py-3 rounded-xl font-medium text-sm text-neutral-700 hover:text-black transition-all active:scale-[0.99] mb-5 shadow-2xs">
              <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={18} height={18} /> Continue with Google
            </button>
            <div className="relative flex items-center justify-center mb-5">
              <div className="absolute border-t border-neutral-100 w-full" />
              <span className="relative bg-white px-4 text-[11px] text-neutral-400 uppercase tracking-widest font-medium">Or email access</span>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authError && <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 text-center animate-shake">{authError}</div>}
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400" required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400" required minLength={6} />
              <button type="submit" disabled={isAuthLoading} className="w-full bg-neutral-950 text-white py-3 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.99] mt-2 disabled:bg-neutral-300 disabled:cursor-not-allowed">
                {isAuthLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : (authMode === "login" ? "Log In" : "Sign Up")}
              </button>
            </form>
            <p className="text-center mt-5 text-xs text-neutral-500">
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }} className="text-neutral-900 font-bold hover:underline">
                {authMode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}