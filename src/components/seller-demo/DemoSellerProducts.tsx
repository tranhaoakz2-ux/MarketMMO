"use client";

import { useMemo, useState } from "react";
import {
  Boxes,
  Database,
  ImagePlus,
  Layers,
  Package,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Column,
  DataTable,
  EmptyState,
  Field,
  FilterBar,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  StatusBadge,
  TextInput,
  Textarea,
  formatVndDemo,
} from "@/components/seller-demo/DemoKit";
import {
  PRODUCT_STATUS_META,
  SELLER_PRODUCTS,
  type DemoProduct,
} from "@/components/seller-demo/mock";

const FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
];

function StockCell({ p }: { p: DemoProduct }) {
  if (p.stockManaged) {
    const low = p.stockAvailable < 3;
    return (
      <StatusBadge tone={low ? "warn" : "info"} dot>
        Kho thật: {p.stockAvailable}
      </StatusBadge>
    );
  }
  return <span className="tabular-nums text-foreground">{p.stock}</span>;
}

export default function DemoSellerProducts() {
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(
    () =>
      SELLER_PRODUCTS.filter(
        (p) => (status === "ALL" || p.status === status) && p.name.toLowerCase().includes(q.toLowerCase())
      ),
    [q, status]
  );

  const columns: Column<DemoProduct>[] = [
    {
      key: "name",
      header: "Sản phẩm",
      primary: true,
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-alt text-muted">
            <Package className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="max-w-[300px] truncate font-semibold text-foreground">{p.name}</p>
            <p className="text-[11px] text-muted">
              {p.categoryLabel}
              {p.variants.length > 0 ? ` · ${p.variants.length} phiên bản` : ""}
              {p.preOrder ? " · Đặt trước" : ""}
            </p>
          </div>
        </div>
      ),
    },
    { key: "price", header: "Giá", align: "right", render: (p) => <span className="whitespace-nowrap font-bold tabular-nums text-danger">{formatVndDemo(p.price)}</span> },
    { key: "stock", header: "Kho", align: "right", render: (p) => <StockCell p={p} /> },
    { key: "sold", header: "Đã bán", align: "right", render: (p) => <span className="tabular-nums text-muted">{p.sold}</span> },
    { key: "status", header: "Trạng thái", render: (p) => <StatusBadge tone={PRODUCT_STATUS_META[p.status].tone} dot>{PRODUCT_STATUS_META[p.status].label}</StatusBadge> },
    {
      key: "actions",
      header: "",
      align: "right",
      hideOnMobile: true,
      render: () => (
        <div className="flex justify-end gap-1.5">
          <button
            title="Nhập kho dữ liệu giao hàng"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-foreground transition hover:border-brand-dark hover:text-brand-dark"
          >
            <Database className="h-4 w-4" />
          </button>
          <button
            title="Thêm / sửa phiên bản"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border-c bg-surface text-foreground transition hover:border-brand-dark hover:text-brand-dark"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sản phẩm"
        subtitle="Đăng sản phẩm mới (cần admin duyệt), quản lý phiên bản & kho dữ liệu giao hàng."
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            {showForm ? "Đóng biểu mẫu" : "Đăng sản phẩm mới"}
          </Button>
        }
      />

      {showForm && (
        <Card className="border-brand-dark/30">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-ink">
              <PlusCircle className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-black text-foreground">Đăng sản phẩm mới</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
            {/* Ảnh */}
            <button className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-c bg-surface-alt text-muted transition hover:border-brand-dark hover:text-brand-dark">
              <ImagePlus className="h-8 w-8" strokeWidth={1.6} />
              <span className="text-xs font-semibold">Tải ảnh sản phẩm</span>
            </button>
            {/* Trường */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Tên sản phẩm">
                  <TextInput placeholder="VD: Gmail US random new, bảo hành 7 ngày" />
                </Field>
              </div>
              <Field label="Danh mục" hint="Chưa có? Thêm danh mục mới ngay trong dropdown.">
                <Select defaultValue="gmail">
                  <option value="gmail">Gmail</option>
                  <option value="facebook">Facebook</option>
                  <option value="discord">Discord</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Giá (đ)"><TextInput type="number" placeholder="12000" /></Field>
                <Field label="Kho"><TextInput type="number" placeholder="100" /></Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Mô tả ngắn"><TextInput placeholder="1 dòng mô tả nổi bật" /></Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Mô tả chi tiết" hint="Mỗi dòng là 1 gạch đầu dòng">
                  <Textarea rows={3} placeholder={"IP sạch, kèm mail khôi phục\nBảo hành 7 ngày lỗi 1 đổi 1"} />
                </Field>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-brand-dark/30 bg-brand-light/10 p-3 text-xs text-muted">
            <Boxes className="h-4 w-4 shrink-0 text-brand-dark" />
            Có thể thêm phiên bản (gói) & dán kho dữ liệu giao hàng ngay trong biểu mẫu này.
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button>Gửi để duyệt</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Huỷ</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4">
          <FilterBar>
            <SearchInput value={q} onChange={setQ} placeholder="Tìm theo tên sản phẩm..." />
            <Segmented value={status} onChange={setStatus} options={FILTERS} />
          </FilterBar>
        </div>

        {/* Ghi chú lý do từ chối (nếu có) hiển thị nổi bật phía trên bảng */}
        {filtered.some((p) => p.status === "REJECTED" && p.adminNote) && (
          <div className="mb-3 flex flex-col gap-2">
            {filtered
              .filter((p) => p.status === "REJECTED" && p.adminNote)
              .map((p) => (
                <div key={p.id} className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-xs text-danger">
                  <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <b>{p.name}</b> bị từ chối: {p.adminNote}
                  </span>
                </div>
              ))}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          empty={<EmptyState icon={Package} title="Chưa có sản phẩm">Bấm &quot;Đăng sản phẩm mới&quot; để bắt đầu bán.</EmptyState>}
        />
      </Card>
    </div>
  );
}
