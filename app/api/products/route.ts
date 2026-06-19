import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { put } from "@vercel/blob";

// The POST function handles incoming Form Data (Text + Files)
export async function POST(request: Request) {
  try {
    const data = await request.formData();
    
    // 1. Extract the text data
    const name = data.get('name') as string;
    const description = data.get('description') as string;
    const price = parseFloat(data.get('price') as string);
    const stock = parseInt(data.get('stock') as string);
    
    // 2. Extract the file
    const file: File | null = data.get('image') as unknown as File;
    let imageUrl = null;

    // 3. If an image was uploaded, save it to Vercel Blob storage
    if (file && file.name) {
      // Clean the filename so there are no spaces or weird characters
      const cleanFileName = file.name.replaceAll(' ', '_');
      const filename = `${Date.now()}-${cleanFileName}`;
      
      // Upload directly to Vercel Blob
      const blob = await put(`uploads/${filename}`, file, {
        access: 'public', // Makes the image publicly readable on the storefront
      });
      
      // This is the secure cloud link we save to the database!
      imageUrl = blob.url;
    }

    // 4. Save everything to PostgreSQL
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        imageUrl,
      },
    });

    return NextResponse.json(newProduct, { status: 201 });
    
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to create the product" }, 
      { status: 500 }
    );
  }
}

// The GET function stays exactly the same!
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}