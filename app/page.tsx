"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import toast from "react-hot-toast";

// --- TYPES & INTERFACES ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}
interface CartItem extends Product {
  cartQuantity: number;
}

export default function Storefront() {
  const { data: session, status } = useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart UI States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Auth Modal States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // 1. Fetch Inventory
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  // 2. Fetch Persistent Cart
  useEffect(() => {
    let isMounted = true;
    const syncCart = async () => {
      if (session?.user) {
        try {
          const res = await fetch("/api/cart");
          const data = await res.json();
          if (isMounted) setCart(data);
        } catch (err) {
          console.error("Failed to load cart:", err);
        }
      } else {
        setTimeout(() => {
          if (isMounted) setCart([]);
        }, 0);
      }
    };
    syncCart();
    return () => {
      isMounted = false;
    };
  }, [session]);

  // 3. Auth Engine
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

  // 4. Cart Operations
  const handleAddToCart = async (product: Product) => {
    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    const currentQty = existingItem ? existingItem.cartQuantity : 0;
    
    if (currentQty >= product.stock) {
      toast.error(`Sorry, only ${product.stock} left in stock!`);
      return; 
    }

    setCart((prevCart) => {
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item,
        );
      }
      return [...prevCart, { ...product, cartQuantity: 1 }];
    });
    
    setIsCartOpen(true);

    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
    } catch (error) {
      console.error("Failed to sync cart:", error);
    }
  };

  const handleRemoveFromCart = async (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    try {
      await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
    } catch (error) {
      console.error("Failed to remove from cart:", error);
    }
  };

  const cartTotalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.cartQuantity,
    0,
  );
  const cartTotalItems = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-[#FBFBF9] text-gray-800 font-sans">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-neutral-400 font-semibold animate-pulse">
          Loading Lumora Living
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1A1A1A] font-sans relative antialiased selection:bg-neutral-200 flex flex-col">
      
      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-4 sm:px-8 py-4 bg-white/75 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-40 transition-all duration-200">
        <Link href="/" className="text-xl sm:text-2xl font-serif tracking-tight font-black hover:opacity-80 transition-opacity">
          Lumora Living
        </Link>
        <div className="flex gap-3 sm:gap-6 items-center">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 hover:text-black transition-colors hidden sm:block relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 hover:after:w-full after:bg-black after:transition-all"
          >
            Shop
          </Link>

          {session ? (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/profile"
                className="text-[11px] sm:text-sm font-medium text-neutral-600 hover:text-black transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/orders"
                className="text-[11px] sm:text-sm font-medium text-neutral-600 hover:text-black transition-colors"
              >
                Orders
              </Link>
              <span className="text-xs font-medium text-neutral-400 max-w-30 truncate hidden md:block">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-[11px] sm:text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full hover:bg-neutral-50 text-neutral-700 hover:text-black transition-all"
            >
              Log in
            </button>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition-all active:scale-95 shadow-sm hover:shadow-md"
          >
            <span className="text-[11px] sm:text-sm font-medium">Cart</span>
            <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full transition-all ${cartTotalItems > 0 ? 'bg-white text-neutral-900' : 'text-neutral-400'}`}>
              {cartTotalItems}
            </span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="px-4 sm:px-8 pt-12 pb-8 sm:pt-24 sm:pb-12 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 bg-white border border-neutral-200/80 rounded-full px-3 py-1 text-[10px] sm:text-xs font-medium tracking-wide text-neutral-500 shadow-2xs">
          <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse" />
          Artisan Crafted & Poured
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif font-bold tracking-tight text-neutral-900 leading-[1.15] max-w-3xl mx-auto">
          Handcrafted goods for a <span className="italic font-normal text-neutral-700">slower, warmer</span> home.
        </h1>
        <p className="text-sm sm:text-lg text-neutral-500 max-w-2xl mx-auto font-light leading-relaxed px-2">
          Discover our collection of artisan-made DIY products, poured, shaped,
          and crafted with intention.
        </p>
      </header>

      {/* PRODUCT GRID */}
      <main className="px-3 sm:px-8 pb-24 max-w-7xl mx-auto flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10">
          {products.map((product) => (
            <div key={product.id} className="group flex flex-col bg-white border border-neutral-100 rounded-2xl p-2.5 sm:p-3.5 transition-all duration-300 hover:shadow-xl hover:shadow-neutral-100 hover:-translate-y-1">
              <Link
                href={`/product/${product.id}`}
                className="w-full aspect-4/5 bg-neutral-100 rounded-xl mb-3 sm:mb-4 overflow-hidden relative block cursor-pointer shadow-inner"
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    priority={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-tr from-neutral-200 to-neutral-50" />
                )}
                {product.stock === 0 && (
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-neutral-900/90 backdrop-blur-xs text-white px-2 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] tracking-wider font-bold uppercase rounded-md z-10 shadow-xs">
                    Sold Out
                  </span>
                )}
              </Link>
              
              <div className="flex flex-col flex-1 min-h-14 sm:min-h-18 justify-between px-1 sm:px-1">
                <Link href={`/product/${product.id}`} className="block group-hover:opacity-80 transition-opacity">
                  <h3 className="font-serif font-bold text-sm sm:text-lg text-neutral-900 tracking-tight line-clamp-2 sm:line-clamp-1 leading-snug sm:leading-tight">
                    {product.name}
                  </h3>
                </Link>
                <p className="font-mono text-xs sm:text-base font-semibold text-neutral-800 mt-1">
                  ${product.price.toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
                className="w-full mt-3 sm:mt-4 bg-neutral-50 hover:bg-neutral-950 text-neutral-900 hover:text-white border border-neutral-200 hover:border-neutral-950 py-2 sm:py-3 rounded-xl text-[11px] sm:text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {product.stock === 0 ? "Sold Out" : "Add to cart"}
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* PREMIUM FOOTER */}
      <footer className="bg-neutral-950 text-neutral-400 py-16 sm:py-20 mt-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 sm:gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4 pr-4">
            <Link href="/" className="font-serif font-black text-2xl text-white tracking-tight hover:opacity-80 transition-opacity">
              Lumora Living
            </Link>
            <p className="text-sm font-light max-w-sm leading-relaxed text-neutral-400">
              Handcrafted goods for a slower, warmer home. Every piece is poured, shaped, and crafted with intention.
            </p>
          </div>

          {/* Customer Care */}
          <div className="space-y-5">
            <h4 className="text-white font-bold tracking-widest text-[11px] uppercase">Customer Care</h4>
            <ul className="space-y-3 text-sm font-light">
              <li>
                <a href="mailto:support@lumoraliving.com" className="hover:text-white transition-colors flex items-center gap-2">
                  <span className="opacity-50">✉</span> support@lumoraliving.com
                </a>
              </li>
              <li>
                <a href="tel:+9118001234567" className="hover:text-white transition-colors flex items-center gap-2">
                  <span className="opacity-50">✆</span> +91 1800 123 4567
                </a>
              </li>
              <li className="flex items-center gap-2 pt-1">
                <span className="opacity-50 text-xs">🕒</span> Mon - Fri, 9am - 6pm IST
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-5">
            <h4 className="text-white font-bold tracking-widest text-[11px] uppercase">Explore</h4>
            <ul className="space-y-3 text-sm font-light">
              <li><Link href="/" className="hover:text-white transition-colors">Shop All</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Our Story</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Shipping & Returns</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright & Legal */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 mt-16 sm:mt-20 pt-8 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-light">
          <p>© {new Date().getFullYear()} Lumora Living. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-md transition-opacity duration-300"
            onClick={() => {
              setIsAuthModalOpen(false);
              setAuthError("");
            }}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-200 ease-out">
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthError("");
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-900 p-1.5 rounded-full hover:bg-neutral-50 transition-all text-xl"
            >
              &times;
            </button>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-neutral-900 mb-1.5">
                {authMode === "login" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-neutral-500 text-sm font-light">
                {authMode === "login"
                  ? "Log in to continue shopping."
                  : "Join Lumora Living today."}
              </p>
            </div>

            <button
              onClick={() => signIn("google")}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-200 hover:border-neutral-300 py-3 rounded-xl font-medium text-sm text-neutral-700 hover:text-black transition-all active:scale-[0.99] mb-5 shadow-2xs"
            >
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={18}
                height={18}
              />{" "}
              Continue with Google
            </button>

            <div className="relative flex items-center justify-center mb-5">
              <div className="absolute border-t border-neutral-100 w-full" />
              <span className="relative bg-white px-4 text-[11px] text-neutral-400 uppercase tracking-widest font-medium">
                Or email access
              </span>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authError && (
                <div className="bg-red-50 text-red-600 text-xs font-medium p-3 rounded-xl border border-red-100 text-center animate-shake">
                  {authError}
                </div>
              )}
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-neutral-200 bg-neutral-50 rounded-xl p-3 text-sm focus:bg-white focus:ring-1 focus:ring-neutral-950 focus:border-neutral-950 outline-none transition-all placeholder:text-neutral-400"
                  required
                  minLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-neutral-950 text-white py-3 rounded-xl text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-[0.99] mt-2 disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {isAuthLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : authMode === "login" ? (
                  "Log In"
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>

            <p className="text-center mt-5 text-xs text-neutral-500">
              {authMode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                }}
                className="text-neutral-900 font-bold hover:underline"
              >
                {authMode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* CART SLIDE-OUT */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-neutral-950/30 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 cubic-bezier(0.16, 1, 0.3, 1)">
            
            <div className="flex justify-between items-center p-5 border-b border-neutral-100">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-serif font-bold text-neutral-950">Your Bag</h2>
                <span className="text-xs text-neutral-400 font-mono">({cartTotalItems})</span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-neutral-400 hover:text-neutral-900 p-1 rounded-full hover:bg-neutral-50 transition-all text-xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 division-y division-neutral-100">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-2">
                  <span className="text-2xl">📦</span>
                  <p className="text-sm font-light">Your cart is currently empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b border-neutral-100/60 items-center">
                    <div className="w-16 h-20 bg-neutral-50 rounded-lg overflow-hidden relative shrink-0 border border-neutral-100">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-linear-to-tr from-neutral-200 to-neutral-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-medium text-sm text-neutral-900 truncate">{item.name}</h3>
                        <p className="font-mono text-sm font-bold text-neutral-800">${(item.price * item.cartQuantity).toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 font-mono">Quantity: {item.cartQuantity}</p>
                      
                      <button 
                        onClick={() => handleRemoveFromCart(item.id)} 
                        className="text-[11px] text-red-500 hover:text-red-700 mt-2 font-semibold transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-neutral-100 bg-neutral-50/80 backdrop-blur-md">
                <div className="flex justify-between text-base items-baseline mb-4">
                  <span className="text-neutral-500 font-light">Subtotal</span>
                  <span className="font-mono text-lg font-bold text-neutral-950">${cartTotalAmount.toFixed(2)}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full block text-center bg-neutral-950 hover:bg-neutral-800 text-white py-3.5 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-[0.99]"
                >
                  Proceed to Checkout
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}