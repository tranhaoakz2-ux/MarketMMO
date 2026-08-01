import { NextResponse } from "next/server";
import { requireSeller } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  SELLER_DESCRIPTION_MAX_LENGTH,
  SELLER_SHOP_NAME_MAX_LENGTH,
  SELLER_SPECIALTY_MAX_LENGTH,
} from "@/lib/seller-profile";

export async function PATCH(req: Request) {
  const { seller, error } = await requireSeller();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 });
  }

  const data: { shopName?: string; description?: string; specialty?: string | null } = {};

  if (typeof body.shopName === "string") {
    const shopName = body.shopName.trim();
    if (shopName.length < 3) {
      return NextResponse.json({ error: "Tên gian hàng phải có ít nhất 3 ký tự." }, { status: 400 });
    }
    if (shopName.length > SELLER_SHOP_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Tên gian hàng tối đa ${SELLER_SHOP_NAME_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    data.shopName = shopName;
  }

  if (typeof body.description === "string") {
    const description = body.description.trim();
    if (description.length > SELLER_DESCRIPTION_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Giới thiệu gian hàng tối đa ${SELLER_DESCRIPTION_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    data.description = description;
  }

  if (typeof body.specialty === "string") {
    const specialty = body.specialty.trim();
    if (specialty.length > SELLER_SPECIALTY_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Lĩnh vực chuyên / cam kết dịch vụ tối đa ${SELLER_SPECIALTY_MAX_LENGTH} ký tự.` },
        { status: 400 }
      );
    }
    data.specialty = specialty || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có gì để cập nhật." }, { status: 400 });
  }

  const updated = await prisma.seller.update({ where: { id: seller!.id }, data });

  return NextResponse.json({
    shopName: updated.shopName,
    description: updated.description,
    specialty: updated.specialty,
  });
}
