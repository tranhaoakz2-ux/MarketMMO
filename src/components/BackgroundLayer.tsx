/**
 * BackgroundLayer — lớp nền toàn trang cho MaketMMO
 * - Lưới ô vuông mờ + tuyết rơi (nhiều hạt)
 * - Dark mode: lưới trắng mờ, tuyết trắng
 * - Light mode: lưới đen mờ, tuyết vàng chanh
 * - Phủ toàn trang, cố định (fixed), z-index âm -> KHÔNG chặn click
 * - Tự tắt tuyết khi máy bật "giảm chuyển động" (xem globals.css)
 *
 * Đặt component này làm CON ĐẦU TIÊN trong <body>, TRƯỚC <Providers>
 * trong src/app/layout.tsx. Không cần "use client" vì chỉ render tĩnh (CSS lo animation).
 *
 * Số hạt tuyết: 40 (mật độ dày). Vị trí/tốc độ/kích thước sinh cố định
 * (không random runtime) để tránh hydration mismatch giữa server và client.
 */

// mảng cấu hình tuyết cố định (left %, size px, duration s, delay s, opacity)
const SNOW = [
  [4, 4, 7, 0, 0.9], [9, 2, 11, 2, 0.5], [14, 5, 6, 1, 1], [19, 3, 9, 3, 0.7],
  [24, 2, 12, 0.5, 0.5], [29, 4, 8, 2.5, 0.85], [34, 3, 10, 1.5, 0.7], [39, 5, 6.5, 4, 1],
  [44, 2, 13, 0, 0.45], [49, 4, 7.5, 2, 0.9], [54, 3, 9.5, 3.5, 0.7], [59, 5, 6, 1, 1],
  [64, 2, 11.5, 0.5, 0.5], [69, 4, 8.5, 2.8, 0.85], [74, 3, 10, 1.2, 0.7], [79, 5, 7, 3, 1],
  [84, 2, 12.5, 0, 0.5], [89, 4, 8, 2.2, 0.9], [94, 3, 9, 1.8, 0.7], [97, 4, 7.5, 6.5, 0.85],
  [7, 3, 10.5, 4.5, 0.6], [17, 4, 7.8, 5, 0.85], [27, 2, 13, 3.2, 0.45], [37, 5, 6.2, 5.5, 1],
  [47, 3, 9.8, 4.2, 0.7], [57, 4, 8.2, 6, 0.9], [67, 2, 12, 4.8, 0.5], [77, 5, 6.8, 5.2, 1],
  [87, 3, 10, 3.8, 0.7], [2, 4, 8.6, 1.4, 0.8], [12, 3, 11, 2.6, 0.6], [22, 5, 6.4, 3.9, 1],
  [32, 2, 12.8, 0.8, 0.5], [42, 4, 7.2, 4.6, 0.9], [52, 3, 9.2, 2.1, 0.7], [62, 5, 6.6, 5.8, 1],
  [72, 2, 11.8, 1.1, 0.5], [82, 4, 8.8, 3.3, 0.85], [92, 3, 10.4, 4.9, 0.7], [15, 5, 6.9, 6.2, 1],
] as const;

export default function BackgroundLayer() {
  return (
    <div className="mmo-bg" aria-hidden="true">
      <div className="mmo-bg-grid" />
      <div className="mmo-bg-snow">
        {SNOW.map(([left, size, dur, delay, op], i) => (
          <span
            key={i}
            className="mmo-flake"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
              opacity: op,
            }}
          />
        ))}
      </div>
    </div>
  );
}
