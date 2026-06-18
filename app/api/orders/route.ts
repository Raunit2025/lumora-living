import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db"; // <-- Fixed import path!
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  try {
    const { customerEmail, items, paymentId } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items found" }, { status: 400 });
    }

    const session = await getServerSession();
    const user = session?.user?.email 
      ? await prisma.user.findUnique({ where: { email: session.user.email } })
      : null;

    // Because the import path is fixed, TypeScript perfectly understands what `tx` is now!
    const order = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      // 1. Securely calculate prices using the database
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        totalAmount += product.price * item.quantity;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price, // Secured backend price
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // 2. Create the final order
      const createdOrder = await tx.order.create({
        data: {
          customerEmail,
          userId: user?.id,
          totalAmount,
          status: paymentId ? "PAID" : "PENDING",
          items: {
            create: orderItemsData,
          },
        },
      });

      // 3. Clear the user's persistent cart after success
      if (user?.id) {
        await tx.cartItem.deleteMany({
          where: { userId: user.id },
        });
      }

      return createdOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order Creation Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}