import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getAdminAuctionSlots } from "@/lib/queries";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const slots = await getAdminAuctionSlots();
  return NextResponse.json({ slots });
}
