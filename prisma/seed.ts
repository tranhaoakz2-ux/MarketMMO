import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categories } from "../src/data/categories";
import { products } from "../src/data/products";

const prisma = new PrismaClient();

const sellerSeed = [
  { name: "MarketMMO Store", phone: "0900000001", insuranceBalance: 3_000_000 },
  { name: "AccVerse", phone: "0900000002", insuranceBalance: 2_500_000 },
  { name: "ProAccounts", phone: "0900000003", insuranceBalance: 1_800_000 },
  { name: "CloudHouse", phone: "0900000004", insuranceBalance: 2_200_000 },
];

function slugifySeller(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

async function main() {
  console.log("Seeding categories...");
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, emoji: cat.emoji },
      create: { slug: cat.slug, name: cat.name, emoji: cat.emoji },
    });
  }

  console.log("Seeding sellers...");
  const sellerPassword = await bcrypt.hash("Seller@123", 10);
  for (const s of sellerSeed) {
    const slug = slugifySeller(s.name);
    const email = `${slug}@marketmmo.pro`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        username: slug,
        name: s.name,
        passwordHash: sellerPassword,
        phone: s.phone,
        role: "SELLER",
        walletBalance: 0,
      },
    });
    await prisma.seller.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        shopName: s.name,
        slug,
        description:
          "Gian hàng uy tín trên MarketMMO.PRO, cung cấp sản phẩm chất lượng. Hỗ trợ tận tâm — mua sắm an tâm, hài lòng tuyệt đối.",
        phone: s.phone,
        level: 4,
        verified: true,
        insuranceBalance: s.insuranceBalance,
      },
    });
  }

  console.log("Seeding products...");
  for (const p of products) {
    const category = await prisma.category.findUnique({
      where: { slug: p.categorySlug },
    });
    const sellerSlug = slugifySeller(p.seller);
    const sellerUser = await prisma.user.findUnique({
      where: { email: `${sellerSlug}@marketmmo.pro` },
      include: { seller: true },
    });
    if (!category || !sellerUser?.seller) {
      console.warn(`Skip product ${p.slug}: missing category/seller`);
      continue;
    }
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        description: JSON.stringify(p.description),
        attributes: JSON.stringify(p.attributes),
        price: p.price,
        priceMax: p.priceMax,
        originalPrice: p.originalPrice,
        stock: p.stock,
        sold: p.sold,
        views: p.views,
        rating: p.rating,
        reviewCount: p.reviewCount,
        verified: p.verified,
        hot: Boolean(p.hot),
        categoryId: category.id,
        sellerId: sellerUser.seller.id,
      },
    });
  }

  console.log("Seeding auction slots (vị trí vàng)...");
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const slotSeed = [
    { position: 1, period: "WEEKLY", floorPrice: 50000 },
    { position: 2, period: "WEEKLY", floorPrice: 50000 },
    { position: 3, period: "WEEKLY", floorPrice: 50000 },
    { position: 4, period: "WEEKLY", floorPrice: 50000 },
    { position: 5, period: "DAILY", floorPrice: 20000 },
    { position: 6, period: "DAILY", floorPrice: 20000 },
  ];
  const slotByPosition = new Map<number, string>();
  for (const s of slotSeed) {
    const existing = await prisma.auctionSlot.findFirst({
      where: { position: s.position, status: "OPEN" },
    });
    if (existing) {
      slotByPosition.set(s.position, existing.id);
      continue;
    }
    const durationMs = s.period === "WEEKLY" ? 7 * oneDay : oneDay;
    const created = await prisma.auctionSlot.create({
      data: {
        position: s.position,
        period: s.period,
        floorPrice: s.floorPrice,
        startAt: now,
        endAt: new Date(now.getTime() + durationMs),
        status: "OPEN",
      },
    });
    slotByPosition.set(s.position, created.id);
  }

  console.log("Seeding sample auction bids...");
  const sampleBids: { position: number; sellerSlug: string; productSlug: string; amount: number }[] = [
    { position: 1, sellerSlug: "marketmmo-store", productSlug: "combo-10-gmail-random-gia-si", amount: 60000 },
    { position: 2, sellerSlug: "accverse", productSlug: "facebook-viet-nam-random-reg-lau-nam", amount: 45000 },
    { position: 5, sellerSlug: "proaccounts", productSlug: "gmail-co-2015-2018-kem-ho-so-google", amount: 25000 },
  ];
  for (const b of sampleBids) {
    const slotId = slotByPosition.get(b.position);
    if (!slotId) continue;
    const alreadyBid = await prisma.auctionBid.findFirst({ where: { slotId } });
    if (alreadyBid) continue;
    const sellerUser = await prisma.user.findUnique({
      where: { email: `${b.sellerSlug}@marketmmo.pro` },
      include: { seller: true },
    });
    const product = await prisma.product.findUnique({ where: { slug: b.productSlug } });
    if (!sellerUser?.seller || !product) continue;
    await prisma.auctionBid.create({
      data: {
        slotId,
        sellerId: sellerUser.seller.id,
        productId: product.id,
        amount: b.amount,
      },
    });
  }

  console.log("Nạp thêm số dư ví demo cho seller (để test đấu giá)...");
  for (const s of sellerSeed) {
    const slug = slugifySeller(s.name);
    const user = await prisma.user.findUnique({ where: { email: `${slug}@marketmmo.pro` } });
    if (user && user.walletBalance === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { walletBalance: 300000 },
      });
    }
  }

  console.log("Seeding admin account...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@marketmmo.pro";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: "ADMIN" },
    create: {
      email: adminEmail,
      username: "admin",
      name: "Quản trị viên",
      passwordHash: adminHash,
      role: "ADMIN",
      walletBalance: 0,
    },
  });

  console.log("Seeding demo buyer account...");
  const buyerHash = await bcrypt.hash("Buyer@123", 10);
  await prisma.user.upsert({
    where: { email: "buyer@marketmmo.pro" },
    update: {},
    create: {
      email: "buyer@marketmmo.pro",
      username: "demo-buyer",
      name: "Người mua demo",
      passwordHash: buyerHash,
      role: "BUYER",
      walletBalance: 500000,
    },
  });

  console.log("Seeding bài viết diễn đàn mẫu...");
  const forumAuthorEmails = [
    "buyer@marketmmo.pro",
    "marketmmo-store@marketmmo.pro",
    "accverse@marketmmo.pro",
    "proaccounts@marketmmo.pro",
    "cloudhouse@marketmmo.pro",
    adminEmail,
  ];
  const forumPostSeed = [
    {
      title: "Tài khoản US cổ 2018-2024",
      content:
        "Chia sẻ kinh nghiệm chọn mua tài khoản US cổ, cách kiểm tra độ trust trước khi xuống tiền. Anh em nên ưu tiên seller có xác thực và lịch sử đơn hàng rõ ràng.",
      category: "Kinh nghiệm",
    },
    {
      title: "Tặng AE link canva pro free",
      content:
        "Chia sẻ link Canva Pro miễn phí cho anh em trong cộng đồng, dùng thử trước khi mua gói chính thức trên sàn.",
      category: "Chia sẻ",
    },
    {
      title: "Mua clone amz zip sll",
      content: "Tìm nguồn mua clone Amazon giá tốt, ai có nguồn uy tín comment giúp mình nhé.",
      category: "Hỏi đáp",
    },
    {
      title: "Cách kiểm tra seller trước khi đặt cọc",
      content:
        "Có ai từng giao dịch với seller mới chưa, review giúp mình trước khi đặt cọc. Nên xem rating và số lượng đơn đã hoàn thành ở trang gian hàng.",
      category: "Cảnh báo",
    },
    {
      title: "Bán Gmail mới 2025",
      content: "Xả kho Gmail random mới tạo 2025, giá sỉ cho anh em nuôi số lượng lớn.",
      category: "Mua bán",
    },
    {
      title: "Hướng dẫn nuôi tài khoản Facebook mới tạo",
      content:
        "Quy trình nuôi acc FB từ ngày đầu tới khi ổn định, hạn chế checkpoint: đăng nhập đều đặn, tránh đổi IP liên tục, tương tác tự nhiên trong 2 tuần đầu.",
      category: "Kinh nghiệm",
    },
    {
      title: "Thông báo bảo trì hệ thống ví",
      content: "MarketMMO thông báo bảo trì hệ thống nạp/rút ví định kỳ, anh em lưu ý sắp xếp giao dịch trước giờ bảo trì.",
      category: "Thông báo",
    },
  ];

  const forumUsers: { id: string }[] = [];
  for (const email of forumAuthorEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) forumUsers.push(user);
  }

  if (forumUsers.length > 0) {
    const existingPostCount = await prisma.forumPost.count();
    if (existingPostCount === 0) {
      const createdPosts = [];
      for (let i = 0; i < forumPostSeed.length; i++) {
        const p = forumPostSeed[i];
        const author = forumUsers[i % forumUsers.length];
        const post = await prisma.forumPost.create({
          data: { title: p.title, content: p.content, category: p.category, authorId: author.id },
        });
        createdPosts.push(post);
      }

      console.log("Seeding bình luận + lượt thích mẫu...");
      const sampleComments = [
        "Cảm ơn bạn đã chia sẻ, rất hữu ích!",
        "Mình cũng từng gặp trường hợp này, đồng ý với bạn.",
        "Cho mình xin thêm thông tin chi tiết được không?",
      ];
      for (const post of createdPosts) {
        for (let i = 0; i < 2; i++) {
          const commenter = forumUsers[(i + 1) % forumUsers.length];
          await prisma.forumComment.create({
            data: {
              postId: post.id,
              authorId: commenter.id,
              content: sampleComments[i % sampleComments.length],
            },
          });
        }
        for (const liker of forumUsers.slice(0, 3)) {
          await prisma.forumLike.create({
            data: { postId: post.id, userId: liker.id },
          });
        }
      }
    }
  }

  console.log("Seed hoàn tất.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
  console.log("Demo buyer: buyer@marketmmo.pro / Buyer@123 (ví 500.000đ)");
  console.log("Seller demo: <slug>@marketmmo.pro / Seller@123 (vd: marketmmo-store@marketmmo.pro)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
