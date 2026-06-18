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

  // The underscore tells ESLint we are intentionally dropping the password for security
  const { password: _password, ...safeUser } = user;
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

  // Handle Password Change
  if (oldPassword && newPassword) {
    if (!user.password) {
      return NextResponse.json({ error: "Google accounts cannot change passwords here." }, { status: 400 });
    }
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return NextResponse.json({ error: "Incorrect old password." }, { status: 400 });
    
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  // We await the update but don't assign it to a variable since we don't need to read it
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

  const { street, city, state, zipCode } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const newAddress = await prisma.address.create({
    data: {
      userId: user.id,
      street,
      city,
      state,
      zipCode,
      isDefault: (await prisma.address.count({ where: { userId: user.id } })) === 0,
    },
  });

  return NextResponse.json(newAddress, { status: 201 });
}