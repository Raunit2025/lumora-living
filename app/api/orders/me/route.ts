import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    // 1. Securely verify who is requesting the data
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch only the orders belonging to this email
    const orders = await prisma.order.findMany({
      where: { customerEmail: session.user.email },
      orderBy: { createdAt: "desc" }, // Newest orders first
      include: {
        items: {
          include: {
            product: true, // Bring in the product details and images!
          },
        },
      },
    });

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}