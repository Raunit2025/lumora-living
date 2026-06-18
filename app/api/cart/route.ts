import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// GET: Fetch the user's saved cart
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json([], { status: 200 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json([], { status: 200 });

    const dbCartItems = await prisma.cartItem.findMany({
        where: { userId: user.id },
        include: { product: true },
    });

    // Format the data to perfectly match what your frontend already expects!
    const formattedCart = dbCartItems.map((item: {
        quantity: number;
        product: {
            id: string;
            name: string;
            description: string;
            price: number;
            stock: number;
            imageUrl: string | null;
        }
    }) => ({
        ...item.product,
        cartQuantity: item.quantity,
    }));

    return NextResponse.json(formattedCart, { status: 200 });
}

// POST: Add an item or increase its quantity
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId, quantity } = await request.json();
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Use "upsert" - if it exists, update it. If not, create it!
    const cartItem = await prisma.cartItem.upsert({
        where: {
            userId_productId: { userId: user.id, productId },
        },
        update: {
            quantity: { increment: quantity },
        },
        create: {
            userId: user.id,
            productId,
            quantity,
        },
    });

    return NextResponse.json(cartItem, { status: 200 });
}

// DELETE: Remove an item from the cart
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { productId } = await request.json();
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.cartItem.delete({
        where: {
            userId_productId: { userId: user.id, productId },
        },
    });

    return NextResponse.json({ success: true }, { status: 200 });
}