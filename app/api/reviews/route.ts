import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, rating, comment } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const review = await prisma.review.create({
    data: { productId, userId: user.id, rating, comment },
  });

  return NextResponse.json(review, { status: 201 });
}