import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// NEW: The GET function fetches a single product for the Product Detail Page
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;

    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id },
      // NEW: Fetch reviews and the name of the user who left them!
      include: {
        reviews: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// EXISTING: The PUT function handles updating an existing product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, price, stock } = body;

    // Tell Prisma to find the product with this specific ID and update it
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: {
        name,
        description,
        price,
        stock,
      },
    });

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// EXISTING: The DELETE function removes the product from the database
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Tell Prisma to delete the row matching this ID
    await prisma.product.delete({
      where: { id: id },
    });

    return NextResponse.json(
      { message: "Product successfully deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}