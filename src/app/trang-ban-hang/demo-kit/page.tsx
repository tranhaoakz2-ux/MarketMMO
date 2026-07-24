"use client";

import { useState } from "react";
import {
  Box,
  Coins,
  Inbox,
  Package,
  PlusCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  Eyebrow,
  Field,
  FilterBar,
  PageHeader,
  Pagination,
  SearchInput,
  SectionTitle,
  Segmented,
  Select,
  StatCard,
  StatusBadge,
  TextInput,
  Textarea,
  Tone,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";

// TRANG TRÌNH DIỄN bộ component demo (Bước 0) — để duyệt hệ thiết kế TRƯỚC khi
// dựng 11 trang. Dữ liệu GIẢ, không gọi backend, không đụng trang thật.

type Row = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sold: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
};

const STATUS_META: Record<Row["status"], { tone: Tone; label: string }> = {
  APPROVED: { tone: "success", label: "Đã duyệt" },
  PENDING: { tone: "warn", label: "Chờ duyệt" },
  REJECTED: { tone: "danger", label: "Bị từ chối" },
};

const ROWS: Row[] = [
  { id: "1", name: "Gmail US random new, chưa đăng nhập thiết bị nào — bảo hành 7 ngày", category: "Gmail", price: 12000, stock: 214, sold: 1032, status: "APPROVED" },
  { id: "2", name: "Facebook Việt Nam 2FA, cổ 2018, dễ đổi thông tin", category: "Facebook", price: 39000, stock: 42, sold: 318, status: "APPROVED" },
  { id: "3", name: "ChatGPT Team cấp sẵn, dùng riêng 1 tháng", category: "ChatGPT", price: 220000, stock: 3, sold: 96, status: "PENDING" },
  { id: "4", name: "Discord Nitro 1 tháng full boost", category: "Discord", price: 85000, stock: 0, sold: 74, status: "REJECTED" },
  { id: "5", name: "Steam key game AAA random", category: "Khác", price: 55000, stock: 128, sold: 12, status: "APPROVED" },
  { id: "6", name: "TikTok kênh 10k follow thật, tương tác cao", category: "TikTok", price: 450000, stock: 5, sold: 4, status: "PENDING" },
];

const columns: Column<Row>[] = [
  {
    key: "name",
    header: "Sản phẩm",
    primary: true,
    render: (r) => (
      <div className="min-w-0">
        <p className="max-w-[280px] truncate font-semibold text-foreground">{r.name}</p>
        <p className="text-[11px] text-muted">{r.category}</p>
      </div>
    ),
  },
  { key: "price", header: "Giá", align: "right", render: (r) => <span className="font-bold tabular-nums text-danger">{formatVndDemo(r.price)}</span> },
  { key: "stock", header: "Kho", align: "right", render: (r) => <span className="tabular-nums text-foreground">{r.stock}</span> },
  { key: "sold", header: "Đã bán", align: "right", render: (r) => <span className="tabular-nums text-muted">{r.sold}</span> },
  { key: "status", header: "Trạng thái", render: (r) => <StatusBadge tone={STATUS_META[r.status].tone} dot>{STATUS_META[r.status].label}</StatusBadge> },
];

const TONES: { tone: Tone; label: string }[] = [
  { tone: "success", label: "Đã giải ngân" },
  { tone: "warn", label: "Đang ký quỹ" },
  { tone: "info", label: "Đang chờ sàn" },
  { tone: "danger", label: "Đã huỷ / khiếu nại" },
  { tone: "brand", label: "Nổi bật" },
  { tone: "neutral", label: "Nháp" },
];

export default function DemoKitPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 4;
  const filtered = ROWS.filter((r) => (tab === "all" ? true : r.status === tab.toUpperCase()) && r.name.toLowerCase().includes(q.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-dashed border-brand-dark/40 bg-brand-light/15 px-3 py-2 text-[11px] font-bold text-brand-dark">
        BỘ COMPONENT DEMO · dữ liệu giả — dùng để duyệt hệ thiết kế trước khi dựng 11 trang
      </div>

      {/* 1. PageHeader + actions */}
      <PageHeader
        title="Bộ giao diện mẫu"
        subtitle="Các thành phần dùng chung cho toàn khu Quản lý bán hàng — nhất quán với Tổng quan."
        actions={
          <>
            <Segmented
              value={tab}
              onChange={(v) => {
                setTab(v);
                setPage(1);
              }}
              options={[
                { value: "all", label: "Tất cả" },
                { value: "approved", label: "Đã duyệt" },
                { value: "pending", label: "Chờ duyệt" },
              ]}
            />
            <Button>
              <PlusCircle className="h-4 w-4" /> Đăng sản phẩm
            </Button>
          </>
        }
      />

      {/* 2. StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Coins} iconWrap="bg-brand text-ink" label="Doanh thu kỳ này" value={formatVndDemo(12450000)} accent delta={18} />
        <StatCard icon={Package} label="Sản phẩm đang bán" value="24" sub="3 đang chờ duyệt" />
        <StatCard icon={Wallet} iconWrap="bg-success/10 text-success" label="Số dư ví" value={formatVndDemo(8640000)} />
        <StatCard icon={ShieldCheck} iconWrap="bg-info/10 text-info" label="Quỹ bảo hiểm" value={formatVndDemo(250000)} delta={-4} />
      </div>

      {/* 3. Bảng dữ liệu + filter + pagination */}
      <Card padding="p-5">
        <SectionTitle aside={<span className="text-[11px] text-muted">{filtered.length} sản phẩm</span>}>Danh sách sản phẩm</SectionTitle>
        <div className="mb-4">
          <FilterBar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Tìm theo tên sản phẩm..." />
            <span className="text-xs text-muted">Bảng đẹp, badge trạng thái có màu, tên dài tự cắt gọn</span>
          </FilterBar>
        </div>
        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          empty={<EmptyState icon={Inbox} title="Không có sản phẩm">Thử đổi bộ lọc hoặc từ khoá tìm kiếm khác.</EmptyState>}
        />
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </Card>

      {/* 4. Palette badge trạng thái */}
      <Card>
        <SectionTitle>Badge trạng thái (màu ngữ nghĩa)</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <StatusBadge key={t.tone} tone={t.tone} dot>
              {t.label}
            </StatusBadge>
          ))}
        </div>
      </Card>

      {/* 5. Form mẫu (cho Đợt 2) */}
      <Card>
        <SectionTitle>Form nhập liệu (dùng cho Mã giảm giá / Rút tiền / Đấu giá)</SectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mã giảm giá" hint="Tối thiểu 3 ký tự, viết hoa">
            <TextInput placeholder="VD: SALE20" defaultValue="" />
          </Field>
          <Field label="Loại giảm">
            <Select defaultValue="percent">
              <option value="percent">Theo phần trăm (%)</option>
              <option value="fixed">Số tiền cố định (đ)</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Ghi chú" hint="Không bắt buộc">
              <Textarea rows={3} placeholder="Mô tả điều kiện áp dụng..." />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button>Lưu mã</Button>
          <Button variant="secondary">Xem trước</Button>
          <Button variant="danger">Xoá</Button>
        </div>
      </Card>

      {/* 6. Empty-state */}
      <Card>
        <SectionTitle>Empty-state</SectionTitle>
        <EmptyState icon={Box} title="Chưa có dữ liệu" action={<Button size="sm" variant="secondary">Tạo mới</Button>}>
          Khu vực này sẽ hiển thị danh sách khi bạn có dữ liệu đầu tiên.
        </EmptyState>
      </Card>

      <div className="flex items-center gap-2 pt-2 text-xs text-muted">
        <Eyebrow>Ghi chú</Eyebrow>
        Thu nhỏ cửa sổ để xem bảng chuyển sang dạng thẻ trên mobile. Bật/tắt chế độ tối để kiểm tra cả 2 theme.
      </div>
    </div>
  );
}
