import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getServerSession } from "next-auth";

// POST: Create a new order
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // THE FIX: Extract to a strict constant so TypeScript doesn't lose track of it inside the transaction closure!
    const safeUserEmail = session.user.email;

    const body = await request.json();
    const { items, shippingAddress, paymentMethod, paymentId } = body;

    const user = await prisma.user.findUnique({
      where: { email: safeUserEmail },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 1. Check stock gracefully BEFORE doing any database math
    let totalAmount = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json({ error: "A product in your cart no longer exists." }, { status: 400 });
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Only ${product.stock} left in stock!` },
          { status: 400 }
        );
      }

      totalAmount += product.price * item.quantity;
    }

    // 2. Create Order Safely using a Transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          customerEmail: safeUserEmail, // <--- FIXED HERE
          totalAmount,
          shippingAddress,
          paymentMethod,
          paymentId: paymentId || null,
          status: paymentMethod === "COD" ? "PENDING" : "PAID",
        },
      });

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product!.price,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({
        where: { userId: user.id },
      });

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order Creation Error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while placing your order." }, { status: 500 });
  }
}

// GET: Fetch all orders (for Admin dashboard)
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}