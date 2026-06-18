import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function LoginPage() {
  
  // This function runs entirely on the secure server!
  async function handleLogin(formData: FormData) {
    "use server";
    
    const password = formData.get("password");
    
    // Check against your .env file
    if (password === process.env.ADMIN_PASSWORD) {
      // If correct, issue a secure "VIP Pass" cookie to their browser
      (await cookies()).set("lunora_admin_session", "authenticated", { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 // Cookie lasts for 1 day
      });
      
      // Redirect them to the command center
      redirect("/admin");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-gray-900 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
        <h1 className="text-2xl font-serif font-bold mb-2">Admin Access</h1>
        <p className="text-sm text-gray-500 mb-8">Enter your master password to continue.</p>
        
        {/* We use a standard HTML form connected to our Server Action */}
        <form action={handleLogin} className="space-y-4">
          <input 
            type="password" 
            name="password"
            placeholder="Password" 
            required
            className="w-full border border-gray-300 rounded-md p-3 focus:ring-black focus:border-black outline-none"
          />
          <button 
            type="submit" 
            className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 transition-colors"
          >
            Enter Command Center
          </button>
        </form>
      </div>
    </div>
  );
}