import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "../../../lib/db";

// Initialize Razorpay with your secure keys
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const { items } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. SECURE MATH: Recalculate the total from the database so hackers can't send a $0 price
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      
      if (!product) throw new Error("Product not found");
      if (product.stock < item.quantity) throw new Error(`Not enough stock for ${product.name}`);
      
      totalAmount += product.price * item.quantity;
    }

    // 2. Razorpay expects the amount in the SMALLEST currency unit (cents or paise)
    // $16.99 becomes 1699
    const amountInSmallestUnit = Math.round(totalAmount * 100);

    // 3. Register the order with Razorpay
    const options = {
      amount: amountInSmallestUnit,
      currency: "INR", // You can change this to "INR" if you want to switch your store to Rupees!
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // 4. Send the Razorpay Order ID back to the frontend
    return NextResponse.json(order, { status: 200 });
    
  } catch (error) {
    console.error("Razorpay Initialization Error:", error);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}