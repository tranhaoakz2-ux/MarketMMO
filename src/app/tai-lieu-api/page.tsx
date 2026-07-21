import LegalPageLayout from "@/components/LegalPageLayout";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/products",
    desc: "Lấy danh sách sản phẩm, hỗ trợ lọc theo category, khoảng giá, tình trạng kho.",
  },
  {
    method: "GET",
    path: "/api/v1/products/{slug}",
    desc: "Lấy chi tiết một sản phẩm theo slug.",
  },
  {
    method: "POST",
    path: "/api/v1/orders",
    desc: "Tạo đơn hàng mới, trừ số dư ví và kích hoạt giao hàng tự động.",
  },
  {
    method: "GET",
    path: "/api/v1/wallet/balance",
    desc: "Truy vấn số dư ví hiện tại của tài khoản đang xác thực.",
  },
];

export default function ApiDocsPage() {
  return (
    <LegalPageLayout title="Tài liệu tích hợp API">
      <p>
        MarketMMO cung cấp API cho đối tác/người bán muốn tích hợp tự động hoá
        quy trình đăng sản phẩm, đồng bộ tồn kho và xử lý đơn hàng. Tài liệu
        dưới đây mô tả sơ bộ các endpoint chính — phiên bản đầy đủ (xác thực,
        rate limit, webhook) sẽ được công bố khi tính năng API hoàn thiện.
      </p>

      <section>
        <h2 className="mb-2 text-base font-bold text-foreground">Xác thực</h2>
        <p>
          Mọi request cần đính kèm header{" "}
          <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs">
            Authorization: Bearer &lt;api_key&gt;
          </code>
          . API key được cấp trong trang quản lý gian hàng sau khi tài khoản
          người bán được xác minh.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">Endpoint chính</h2>
        <div className="overflow-x-auto rounded-xl border border-border-c">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border-c bg-surface-alt text-xs font-bold text-muted">
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5">Endpoint</th>
                <th className="px-4 py-2.5">Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e) => (
                <tr key={e.path} className="border-b border-border-c last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-success">
                    {e.method}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                    {e.path}
                  </td>
                  <td className="px-4 py-2.5 text-foreground/70">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LegalPageLayout>
  );
}

export const metadata = {
  title: "Tài liệu tích hợp API — MarketMMO",
};
