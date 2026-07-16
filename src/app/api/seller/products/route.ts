import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { getMySellerProducts } from "@/lib/queries";

export async function GET() {
  const { session, error } = await requireSeller();
  if (error) return error;

  const products = await getMySellerProducts(session!.user.id);
  return NextResponse.json({ products });
}
