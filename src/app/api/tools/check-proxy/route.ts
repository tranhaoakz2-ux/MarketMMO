import net from "node:net";
import { NextResponse } from "next/server";

const MAX_PROXIES = 20;
const CONNECT_TIMEOUT_MS = 4000;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// Chặn kết nối tới dải IP private/loopback/link-local để tránh bị lợi dụng
// làm bàn đạp quét mạng nội bộ (SSRF) — chỉ nhận IPv4 dạng chấm thập phân
// công khai, không resolve hostname (tránh DNS rebinding).
function isPrivateOrReservedIp(ip: string): boolean {
  const match = ip.match(IPV4_RE);
  if (!match) return true;
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((n) => n > 255)) return true;
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  if (a >= 224) return true;
  return false;
}

function checkProxy(
  host: string,
  port: number
): Promise<{ status: "live" | "dead"; latencyMs?: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (status: "live" | "dead") => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(status === "live" ? { status, latencyMs: Date.now() - start } : { status });
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => finish("live"));
    socket.once("timeout", () => finish("dead"));
    socket.once("error", () => finish("dead"));
    socket.connect(port, host);
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const proxies = body?.proxies;

  if (!Array.isArray(proxies) || proxies.length === 0) {
    return NextResponse.json({ error: "Danh sách proxy trống." }, { status: 400 });
  }
  if (proxies.length > MAX_PROXIES) {
    return NextResponse.json(
      { error: `Chỉ kiểm tra tối đa ${MAX_PROXIES} proxy mỗi lần.` },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    proxies.map(async (p: { label?: string; host?: string; port?: number }) => {
      const label = String(p.label ?? p.host ?? "").slice(0, 80);
      const host = String(p.host ?? "").slice(0, 45);
      const port = Number(p.port);

      if (
        !host ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        isPrivateOrReservedIp(host)
      ) {
        return { label, host, port, status: "invalid" as const };
      }

      const result = await checkProxy(host, port);
      return { label, host, port, ...result };
    })
  );

  return NextResponse.json({ results });
}
