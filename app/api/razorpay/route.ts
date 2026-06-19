import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "../../../lib/db";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // 1. Check stock gracefully BEFORE creating the Razorpay order
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json({ error: "A product in your cart no longer exists." }, { status: 400 });
      }

      // THE FIX: Return a graceful 400 JSON instead of throwing an error
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Only ${product.stock} left in stock!` },
          { status: 400 }
        );
      }

      totalAmount += product.price * item.quantity;
    }

    // Razorpay expects amount in the smallest currency unit (e.g., paise for INR, cents for USD)
    // If your prices are in dollars, multiply by 100 to get cents.
    const amountInSmallestUnit = Math.round(totalAmount * 100);

    const options = {
      amount: amountInSmallestUnit,
      currency: "INR", // Change to "INR" if you are using Rupees
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error("Razorpay Initialization Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while initializing payment." },
      { status: 500 }
    );
  }
}