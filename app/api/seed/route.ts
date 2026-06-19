import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // 1. Create a Dummy User for reviews
    const hashedPassword = await bcrypt.hash("password123", 10);
    const dummyUser = await prisma.user.upsert({
      where: { email: "sarah.artisan@example.com" },
      update: {},
      create: {
        name: "Sarah Jenkins",
        email: "sarah.artisan@example.com",
        password: hashedPassword,
      },
    });

    // 2. Create Beautiful Dummy Products
    const products = [
      {
        name: "Hand-Poured Soy Candle",
        description: "A calming blend of lavender and cedarwood, poured into a reusable concrete jar. Burns for 40 hours.",
        price: 24.99,
        stock: 50,
        imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800",
      },
      {
        name: "Artisan Clay Mug",
        description: "Speckled ceramic mug perfect for your morning coffee. Wheel-thrown and glazed by hand.",
        price: 32.00,
        stock: 15,
        imageUrl: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=800",
      },
      {
        name: "Woven Linen Throw",
        description: "Lightweight, breathable, and incredibly soft. Adds a touch of texture to any sofa or bed.",
        price: 85.00,
        stock: 0, // Out of stock example!
        imageUrl: "https://images.unsplash.com/photo-1580828369019-22340b043ce6?auto=format&fit=crop&q=80&w=800",
      }
    ];

    for (const p of products) {
      const createdProduct = await prisma.product.create({ data: p });

      // Add a dummy review to each in-stock product
      if (p.stock > 0) {
        await prisma.review.create({
          data: {
            rating: 5,
            comment: "Absolutely love this! The quality is amazing and it looks perfect in my living room.",
            productId: createdProduct.id,
            userId: dummyUser.id,
          }
        });
      }
    }

    return NextResponse.json({ message: "Store successfully seeded with dummy data!" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}