import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { contentTypeForPath, readUploadedFile } from "@/lib/uploads";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { session, error } = await requireUser();
  if (error) return error;
  const userId = session!.user.id;

  const { messageId } = await params;
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  // Không tiết lộ có tồn tại tin nhắn/đính kèm hay không nếu user không
  // thuộc hội thoại chứa nó — trả 404 giống hệt trường hợp không tìm thấy.
  if (
    !message ||
    !message.attachmentPath ||
    (message.conversation.userAId !== userId && message.conversation.userBId !== userId)
  ) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }

  try {
    const buffer = await readUploadedFile(message.attachmentPath);
    const isImage = message.attachmentType === "IMAGE";
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": contentTypeForPath(message.attachmentPath),
        "Content-Disposition": isImage
          ? "inline"
          : `attachment; filename="${encodeURIComponent(message.attachmentName ?? "file")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404 });
  }
}
