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

    // --- NEW PRE-CHECK LOGIC ---
    // Check how many of this item are already in the cart
    const existingItem = cart.find((item) => item.id === product.id);
    const currentQty = existingItem ? existingItem.cartQuantity : 0;
    
    // Stop them immediately if they try to exceed the stock!
    if (currentQty >= product.stock) {
      toast.error(`Sorry, only ${product.stock} left in stock!`);
      return; 
    }
    // ---------------------------

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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-gray-500 font-medium">
        Loading Lunora Living...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#222222] font-sans relative">
      {/* NAVIGATION */}
      <nav className="flex justify-between items-center px-8 py-6 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="text-2xl font-serif tracking-tight font-bold">
          Lunora Living
        </div>
        <div className="flex gap-6 items-center">
          <Link
            href="/"
            className="hover:text-gray-500 transition-colors hidden sm:block"
          >
            Shop
          </Link>

          {session ? (
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="text-sm font-medium hover:text-gray-500"
              >
                Profile
              </Link>
              <Link
                href="/orders"
                className="text-sm font-medium hover:text-gray-500"
              >
                My Orders
              </Link>
              <span className="text-sm font-medium text-gray-500 hidden sm:block">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm font-bold text-red-500 hover:text-red-700"
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-sm font-medium hover:text-gray-500"
            >
              Log in
            </button>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
          >
            <span>🛒 Cart</span>
            {cartTotalItems > 0 && (
              <span className="bg-black text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cartTotalItems}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="px-8 py-20 text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-serif font-bold mb-6 leading-tight">
          Handcrafted goods for a slower, warmer home.
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Discover our collection of artisan-made DIY products, poured, shaped,
          and crafted with intention.
        </p>
      </header>

      {/* PRODUCT GRID */}
      <main className="px-8 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => (
            <div key={product.id} className="group flex flex-col">
              <Link
                href={`/product/${product.id}`}
                className="w-full aspect-4/5 bg-gray-200 rounded-lg mb-4 overflow-hidden relative block cursor-pointer"
              >
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-linear-to-tr from-gray-200 to-gray-100" />
                )}
                {product.stock === 0 && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 text-xs font-bold uppercase rounded z-10">
                    Sold Out
                  </span>
                )}
              </Link>
              <div className="space-y-1 flex-1">
                <Link href={`/product/${product.id}`}>
                  <h3 className="font-semibold text-lg leading-tight group-hover:underline cursor-pointer">
                    {product.name}
                  </h3>
                </Link>
                <p className="font-bold text-lg mt-2">
                  ${product.price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => handleAddToCart(product)}
                disabled={product.stock === 0}
                className="w-full mt-4 border border-black py-2.5 rounded-full font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {product.stock === 0 ? "Out of Stock" : "Add to cart"}
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsAuthModalOpen(false);
              setAuthError("");
            }}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsAuthModalOpen(false);
                setAuthError("");
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl"
            >
              &times;
            </button>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold mb-2">
                {authMode === "login" ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-gray-500 text-sm">
                {authMode === "login"
                  ? "Log in to continue shopping."
                  : "Join Lunora Living today."}
              </p>
            </div>
            <button
              onClick={() => signIn("google")}
              type="button"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors mb-6"
            >
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={20}
                height={20}
              />{" "}
              Continue with Google
            </button>
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute border-t border-gray-200 w-full"></div>
              <span className="relative bg-white px-4 text-xs text-gray-500 uppercase font-medium">
                Or
              </span>
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
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none"
                required
                minLength={6}
              />
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors mt-2 disabled:bg-gray-400"
              >
                {isAuthLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Log In"
                    : "Sign Up"}
              </button>
            </form>
            <p className="text-center mt-6 text-sm text-gray-500">
              {authMode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "signup" : "login");
                  setAuthError("");
                }}
                className="text-black font-semibold hover:underline"
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
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold font-serif">Your Cart</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-black transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                  <span className="text-4xl">🛒</span>
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-6">
                    <div className="w-20 h-20 bg-gray-100 rounded-md overflow-hidden relative shrink-0">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-linear-to-tr from-gray-200 to-gray-100" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="font-bold">${(item.price * item.cartQuantity).toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Qty: {item.cartQuantity}</p>
                      
                      <button 
                        onClick={() => handleRemoveFromCart(item.id)} 
                        className="text-xs text-red-500 hover:underline mt-2 font-medium"
                      >
                        Remove item
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between text-lg font-bold mb-4">
                  <span>Subtotal</span>
                  <span>${cartTotalAmount.toFixed(2)}</span>
                </div>
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full block text-center bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition-colors"
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