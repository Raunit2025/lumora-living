import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// The PATCH method is the industry standard for updating just one specific field (like status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { status } = body;

    // Tell Prisma to find the order and update its status
    const updatedOrder = await prisma.order.update({
      where: { id: resolvedParams.id },
      data: { status },
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}