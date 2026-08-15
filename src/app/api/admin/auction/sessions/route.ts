import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { getAdminAuctionSessions } from "@/lib/queries";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const sessions = await getAdminAuctionSessions();
  return NextResponse.json({ sessions });
}
