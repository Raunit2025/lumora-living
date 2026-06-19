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
      // Replaced alert with our beautiful Modal!
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
      // Replaced alert with our beautiful Modal!
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">Loading...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">Product not found.</div>;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#222222] relative">
      <nav className="flex justify-between p-6 bg-white border-b">
        <Link href="/" className="font-bold text-xl font-serif">Lunora Living</Link>
        <Link href="/" className="hover:underline">&larr; Back to Shop</Link>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        {/* Product Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div className="aspect-square bg-gray-200 relative rounded-2xl overflow-hidden">
            {/* Added a fallback so missing images just look like a sleek grey box */}
            {product.imageUrl ? (
              <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-linear-to-tr from-gray-200 to-gray-100" />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold mb-4 font-serif">{product.name}</h1>
            <p className="text-2xl font-bold mb-6">${product.price.toFixed(2)}</p>
            <p className="text-gray-600 mb-8 leading-relaxed">{product.description}</p>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || isAddingToCart}
              className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {product.stock === 0 ? "Out of Stock" : cartSuccess ? "✓ Added to Cart" : "Add to Cart"}
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-gray-200 pt-12">
          <h2 className="text-2xl font-bold mb-8 font-serif">Customer Reviews</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <h3 className="font-bold mb-4">Write a Review</h3>
              {session ? (
                <form onSubmit={handleAddReview} className="space-y-4 bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded-md outline-none focus:border-black bg-white">
                    <option value="5">⭐⭐⭐⭐⭐ - Excellent</option>
                    <option value="4">⭐⭐⭐⭐ - Good</option>
                    <option value="3">⭐⭐⭐ - Okay</option>
                    <option value="2">⭐⭐ - Poor</option>
                    <option value="1">⭐ - Terrible</option>
                  </select>
                  <textarea required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your thoughts..." rows={4} className="w-full p-3 border border-gray-300 rounded-md outline-none focus:border-black" />
                  <button type="submit" disabled={isSubmittingReview} className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors">
                    {isSubmittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              ) : (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
                  <button onClick={() => setIsAuthModalOpen(true)} className="font-bold text-black hover:underline">Log in</button> to leave a review.
                </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-6">
              {product.reviews.length === 0 ? (
                <p className="text-gray-500 italic">No reviews yet. Be the first!</p>
              ) : (
                product.reviews.map((rev: Review) => (
                  <div key={rev.id} className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-gray-900">{rev.user.name || rev.user.email?.split("@")[0]}</p>
                      <span className="text-yellow-500 tracking-widest text-sm">
                        {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{new Date(rev.createdAt).toLocaleDateString()}</p>
                    <p className="text-gray-700 leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* RESTORED AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsAuthModalOpen(false); setAuthError(""); }} />
          <div className="relative bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button onClick={() => { setIsAuthModalOpen(false); setAuthError(""); }} className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl">&times;</button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold mb-2">{authMode === "login" ? "Welcome back" : "Create an account"}</h2>
              <p className="text-gray-500 text-sm">{authMode === "login" ? "Log in to continue shopping." : "Join Lunora Living today."}</p>
            </div>
            <button onClick={() => signIn("google")} type="button" className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors mb-6">
              <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} /> Continue with Google
            </button>
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute border-t border-gray-200 w-full"></div>
              <span className="relative bg-white px-4 text-xs text-gray-500 uppercase font-medium">Or</span>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authError && <div className="bg-red-50 text-red-500 text-sm p-3 rounded-md border border-red-100 text-center">{authError}</div>}
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none" required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none" required minLength={6} />
              <button type="submit" disabled={isAuthLoading} className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors mt-2 disabled:bg-gray-400">
                {isAuthLoading ? "Please wait..." : (authMode === "login" ? "Log In" : "Sign Up")}
              </button>
            </form>
            <p className="text-center mt-6 text-sm text-gray-500">
              {authMode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }} className="text-black font-semibold hover:underline">
                {authMode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}