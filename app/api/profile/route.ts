import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";

// GET: Fetch the user's details and addresses
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { addresses: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Explicitly build the object to avoid unused variable ESLint errors
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    addresses: user.addresses,
    hasPassword: !!user.password,
  };
  
  return NextResponse.json(safeUser, { status: 200 });
}

// Strictly define what can be updated
interface UpdateData {
  phone?: string;
  password?: string;
}

// PUT: Update Phone or Password
export async function PUT(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { phone, oldPassword, newPassword } = body;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updateData: UpdateData = {};
  if (phone !== undefined) updateData.phone = phone;

  // Handle Password Change safely
  if (oldPassword && newPassword) {
    if (!user.password) {
      return NextResponse.json({ error: "Google accounts cannot change passwords here." }, { status: 400 });
    }
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return NextResponse.json({ error: "Incorrect old password." }, { status: 400 });
    
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

// POST: Add a new Address
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // NEW: Added phone to the extraction
  const { name, street, city, state, zipCode, phone } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newAddress = await prisma.address.create({
    data: {
      userId: user.id,
      name,
      street,
      city,
      state,
      zipCode,
      phone,
      isDefault: (await prisma.address.count({ where: { userId: user.id } })) === 0,
    },
  });

  return NextResponse.json(newAddress, { status: 201 });
}

// DELETE: Remove an Address
export async function DELETE(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { addressId } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  
  if (user && addressId) {
    await prisma.address.deleteMany({ where: { id: addressId, userId: user.id } });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}

// PATCH: Set Address as Default
export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { addressId } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  
  if (user && addressId) {
    // 1. Make all addresses NOT default
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    // 2. Make the selected address default
    await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}