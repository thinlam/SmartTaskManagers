# 07 — Kích cỡ màn hình & thiết kế giao diện mobile

> Cập nhật: 2026-11-19. Áp dụng cho Smart Task Manager, Content Manager, VoiceScribe (bản Web + Android/Capacitor). App Hub chỉ chạy Windows nên không thuộc tài liệu này. Đơn vị: px CSS (web) = pt (iOS) = dp (Android). Số có dấu `?` là suy ra hoặc nguồn mâu thuẫn, chưa kiểm chứng trên máy thật.

## 1. Nguyên tắc (để khỏi sửa tới sửa lui)

1. **Không thiết kế theo từng máy.** Máy mới ra gần như luôn rơi vào một nhóm chiều rộng đã có (xem mục 3). Chỉ thêm máy vào bảng, không thêm màn hình mới.
2. **Thiết kế gốc ở 360, bắt buộc không vỡ ở 320.** Sau đó kiểm tra nở ra 393, 412, 440.
3. **Layout lỏng (fluid):** dùng %, flex/grid, `min()`/`max()`/`clamp()`. Cấm `width` cố định theo px cho khối nội dung chính.
4. **Chiều rộng quyết định bố cục, không phải loại máy.** Dùng breakpoint theo chiều rộng cửa sổ (kể cả foldable gập/mở).
5. **Luôn dùng safe area** (`env(safe-area-inset-*)`), không hard-code số tai thỏ/Dynamic Island.

## 2. Bảng thiết bị tham chiếu

### iPhone (viewport pt | pixel vật lý)

| Máy                 | Viewport  | Pixel     | Ghi chú                    |
| ------------------- | --------- | --------- | -------------------------- |
| iPhone 18 Pro Max   | 440×956   | 1320×2868 | viewport suy ra từ pixel/3 |
| iPhone 18 Pro       | 402×874   | 1206×2622 | suy ra                     |
| iPhone Duo (gập)    | ?         | ?         | chưa có số tin cậy         |
| iPhone 17e          | 390×844 ? | 1170×2532 | suy ra                     |
| iPhone Air          | 420×912   | 1260×2736 |                            |
| iPhone 17 Pro Max   | 440×956   | 1320×2868 |                            |
| iPhone 17 Pro / 17  | 402×874   | 1206×2622 |                            |
| iPhone 16e          | 390×844   | 1170×2532 |                            |
| iPhone 16 Pro Max   | 440×956   | 1320×2868 |                            |
| iPhone 16 Pro       | 402×874   | 1206×2622 |                            |
| iPhone 16 Plus      | 430×932   | 1290×2796 |                            |
| iPhone 16           | 393×852   | 1179×2556 |                            |
| iPhone 15 / 14 Pro  | 393×852   |           |                            |
| iPhone 15 / 14 Plus | 430×932   |           |                            |
| iPhone 13 / 12      | 390×844   |           |                            |
| iPhone 12 / 13 mini | 375×812   |           |                            |
| iPhone SE (2/3)     | 375×667   |           |                            |

### Samsung Galaxy

| Máy                              | Viewport                     | Pixel / DPR    | Ghi chú                                                       |
| -------------------------------- | ---------------------------- | -------------- | ------------------------------------------------------------- |
| S26 Ultra                        | 412×891                      | 1440×3120 @3.5 | 6.9"                                                          |
| S26+                             | 412×891 ?                    | 1440×3120      | nguồn mâu thuẫn                                               |
| S26                              | 360×780                      | 1080×2340 @3   | 6.3"                                                          |
| S26 FE                           | \~360×780                    | 1080×2340      | suy ra                                                        |
| S25 Ultra / S24 Ultra            | 412×891                      | 1440×3120      |                                                               |
| S21 Ultra                        | 384×854                      | 1440×3200      |                                                               |
| S21                              | 360×800                      | 1080×2400      |                                                               |
| Z Fold 7                         | trong 984×1092               | 1968×2184 @2   | 8.0"                                                          |
| Z Fold 6                         | ngoài 323×792, trong 619×720 |                |                                                               |
| Z Flip 7                         | 360×840                      | 1080×2520      |                                                               |
| Z Flip 6                         | 393×960                      | 1080×2640      |                                                               |
| Z Fold 8 / Fold 8 Ultra / Flip 8 | ?                            |                | trong 7.6" 4:3, ngoài 5.5" (Fold 8); chưa có viewport tin cậy |

### Google Pixel

| Máy             | Pixel            | Ghi chú                        |
| --------------- | ---------------- | ------------------------------ |
| Pixel 11 Pro XL | 1344×2992 (6.8") | viewport chưa có số chính thức |
| Pixel 11 Pro    | 1280×2856 (6.3") | viewport chưa có số chính thức |
| Pixel 10 Pro    | —                | \~412 rộng                     |

> Viewport Android phụ thuộc cài đặt "kích thước hiển thị/cỡ chữ" của người dùng. Số trên là mặc định.

## 3. Lớp kích cỡ (size class) dùng trong code

Một bộ breakpoint duy nhất cho cả 3 app. Tên token đề xuất: `--bp-*`.

| Lớp        | Rộng (px) | Máy điển hình                                                    |
| ---------- | --------- | ---------------------------------------------------------------- |
| `xs`       | 320–359   | cover screen Fold (323), máy cũ nhỏ                              |
| `s`        | 360–374   | Galaxy S26 / S21 / Flip 7, Android 1080p phổ thông               |
| `m`        | 375–392   | iPhone SE, mini, 13/12, 17e/16e                                  |
| `l`        | 393–411   | iPhone 15/16, Flip 6, S21 Ultra (384–392 vẫn xếp `m`)            |
| `xl`       | 412–440   | iPhone 16/17/18 Pro, Air, Plus, Pro Max; Galaxy Ultra; Pixel lớn |
| `medium`   | 600–839   | màn trong Fold 6 (619), tablet nhỏ                               |
| `expanded` | ≥ 840     | màn trong Fold 7 (984), tablet, desktop                          |

Quy ước CSS (mobile-first):

```css
:root {
  --bp-medium: 600px;
  --bp-expanded: 840px;
}
/* mặc định = compact (xs→xl), chỉ viết override khi cần */
@media (min-width: 600px) {
  /* medium */
}
@media (min-width: 840px) {
  /* expanded */
}
/* Chỉ dùng thêm mốc 360 / 412 khi nội dung thật sự vỡ */
```

## 4. Khung thiết kế (Figma/Canva)

| Khung               | Rộng×Cao           | Mục đích                            |
| ------------------- | ------------------ | ----------------------------------- |
| Stress              | 320×568            | không vỡ, không cắt chữ/nút         |
| **Gốc**             | **360×780**        | thiết kế chính                      |
| iPhone nhỏ          | 375×667            | SE, kiểm tra chiều cao thấp         |
| iPhone chuẩn        | 393×852            |                                     |
| Pro / Android lớn   | 402×874 và 412×891 |                                     |
| Lớn nhất            | 440×956            | Pro Max, kiểm tra khoảng trống thừa |
| Foldable (medium)   | 620×720            | list–detail 2 cột                   |
| Foldable (expanded) | 984×1092           | 3 vùng / sidebar                    |

Làm **một bộ component co giãn** (auto layout) rồi nở ra các khung, không vẽ lại từng khung.

## 5. Quy tắc layout

- **Lề ngang:** 16 (compact), 24 (medium), 32 (expanded). Khoảng cách theo thang 4.
- **Lưới:** 4 cột (compact), 8 cột (medium), 12 cột (expanded).
- **Vùng chạm:** tối thiểu 44×44pt (iOS) / 48×48dp (Android); khoảng cách giữa 2 nút chạm ≥ 8.
- **Chữ:** nội dung ≥ 14, chú thích ≥ 12; hỗ trợ cỡ chữ hệ thống lớn, không cắt chữ bằng chiều cao cố định.
- **Chiều cao thấp** (SE 667, Flip gập, ngang): nút chính và bàn phím không che ô nhập; cuộn được.
- **Nội dung tối đa:** từ `medium` trở lên giới hạn `max-width` cho cột đọc (~ 640) để dòng chữ không quá dài.
- **Tránh khoảng trống thừa** ở 440 và 984: card co giãn theo lưới, không giữ nguyên kích cỡ 360.

### Safe area

Luôn lấy từ `env(safe-area-inset-top/bottom/left/right)`, kèm `viewport-fit=cover`. Chỉ để tham khảo (iPhone, pt, top / bottom): Air 68/34; 17, 16 Pro, 16 Pro Max 62/34; 16 Plus, 16 59/34. Android: bật edge-to-edge, thanh trạng thái và thanh điều hướng đều tính vào inset. Kiểm tra trên cả điều hướng 3 nút và cử chỉ.

### Foldable

- Lắng nghe `resize`/`matchMedia` để đổi layout khi gập/mở, không chỉ đọc kích thước lúc khởi động.
- Cover screen (~323) phải dùng được. Mở ra (≥600) chuyển sang 2 cột.
- Không mất trạng thái (đang soạn, đang ghi âm) khi gập/mở.

## 6. Ánh xạ vào các màn hình

| Màn / app                  | compact (xs→xl)                               | medium (600–839)      | expanded (≥840)        |
| -------------------------- | --------------------------------------------- | --------------------- | ---------------------- |
| Điều hướng STM             | thanh tab dưới, tối đa 5 mục + "Thêm"         | nav rail trái         | sidebar đầy đủ         |
| Tổng quan / Hôm nay        | 1 cột, card xếp dọc                           | 2 cột                 | 3 cột                  |
| Công việc / Hộp thư        | danh sách; chi tiết là màn mới                | list + detail 2 cột   | list + detail + panel  |
| Thêm nhanh (Quick Add)     | bottom sheet toàn rộng                        | dialog giữa           | dialog giữa            |
| Kanban                     | cuộn ngang, 1 cột ≈ 85% rộng, snap            | 2–3 cột thấy được     | đủ cột                 |
| Gantt                      | cuộn ngang, xem là chính                      | cuộn ngang            | đầy đủ                 |
| Lịch                       | tháng + danh sách ngày dưới                   | tháng/tuần            | tháng/tuần + panel     |
| Content Manager (bảng bài) | bảng → danh sách card                         | bảng rút gọn cột      | bảng đầy đủ            |
| VoiceScribe ghi âm         | nút ghi lớn giữa dưới, cố định theo safe area | như compact, rộng hơn | 2 cột (ghi + bản ghi)  |
| VoiceScribe trình soạn     | 1 cột; người nói là chip                      | 2 cột                 | 2 cột + thanh tìm kiếm |

## 7. Danh sách viewport cần test (DevTools / máy thật)

`320×568`, `360×780`, `375×667`, `390×844`, `393×852`, `402×874`, `412×891`, `420×912`, `430×932`, `440×956`, `620×720`, `984×1092`. Mỗi cỡ test dọc; riêng 360×780, 393×852, 412×891 test thêm ngang.

Tiêu chí qua: không cuộn ngang ngoài ý muốn, không chữ/nút bị cắt, nút chính không bị che bởi thanh hệ thống/bàn phím, vùng chạm đủ cỡ, không khoảng trống bất thường ở 440 và 984.

## 8. Chưa kiểm chứng

- Viewport thật của iPhone 18 Pro/Pro Max, 17e, iPhone Duo (Apple chưa công bố).
- Galaxy S26+ và S26 FE, Z Fold 8 / Fold 8 Ultra / Flip 8, Pixel 11 Pro / Pro XL.
- Mọi số Android khi người dùng đổi cỡ hiển thị. → Khi có máy thật hoặc số chính thức, cập nhật bảng ở mục 2 và ghi vào nhật ký. Nếu chiều rộng mới nằm trong một lớp ở mục 3 thì không cần sửa thiết kế.

## 9. Khi có máy mới

1. Thêm một dòng vào bảng mục 2.
2. Đối chiếu chiều rộng với mục 3. Nếu rơi vào lớp có sẵn: xong.
3. Nếu rơi ngoài mọi lớp hoặc làm vỡ layout: chỉnh breakpoint, cập nhật mục 3 và 7.
