# Kế hoạch: Rút gọn form "Công việc mới"

> Cập nhật: 2026-11-07. **Lưu ý:** file này viết sau khi đã làm xong (quy tắc tạo file kế hoạch mới
> thêm vào `CLAUDE.md` sau khi việc này đã triển khai), nên phần "dự kiến" dưới đây phản ánh đúng những
> gì đã thực hiện thật, không phải suy diễn lại.

## Mục tiêu / nghiệp vụ

Form tạo task ("Công việc mới") quá dài, nhiều trường không cần khi tạo nhanh. Mục tiêu: tạo task phải
nhanh — chỉ Tiêu đề là bắt buộc, các trường phụ phải thu lại để không gây rối.

## Phạm vi

**Làm:**

- Ẩn Tiến độ/Trạng thái khỏi form **tạo mới** (chỉ hiện ở form **sửa**); task mới luôn mặc định
  Hộp thư đến / 0%.
- Bỏ khối "Xem trước", đưa Tiêu đề lên đầu, tự focus khi mở form.
- Giữ cố định: Tiêu đề, Mức ưu tiên, Ngày đến hạn (+ nút nhanh Hôm nay/Ngày mai/+3 ngày/Tuần sau), Dự án.
- Gộp Mô tả, Thẻ, Ngày bắt đầu, Nhắc tôi lúc, Đường dẫn đính kèm, Lĩnh vực, Mục tiêu, Công việc cha vào
  mục gập "Thêm chi tiết" (đóng mặc định, tự mở khi sửa task đã có dữ liệu ở đó hoặc khi lỗi validate
  rơi vào các trường trong đó).
- Nút "Thêm công việc" nổi bật hơn nút phụ "Thêm & tạo tiếp".

**Không làm:**

- Không đổi backend/schema, không đổi API, không đổi logic validate hiện có.
- Không đổi hành vi form Sửa (Trạng thái/Tiến độ vẫn hiện như cũ).

## Thiết kế / cách làm

- Chỉ sửa 1 component: `packages/app-core/src/components/TaskDetailDrawer.tsx` (state cục bộ
  `useState`, dùng `<details>`/`<summary>` làm UI gập — không có sẵn component collapsible chung trong
  `packages/ui`).
- Thêm state `detailsOpen`; mở lại tự động dựa trên dữ liệu có sẵn khi mở form sửa, hoặc khi lỗi
  validate rơi vào field nằm trong mục gập (`DETAIL_ERROR_FIELDS`).
- Thêm 2 key i18n mới (`tasks.sectionMoreDetails`, `tasks.moreDetailsHint`) ở cả `vi.json`/`en.json`.
- Không đổi backend/schema.

## Rủi ro

| Rủi ro                                                                                        | Mức        | Giảm thiểu                                                                                                               |
| --------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Người dùng tưởng không đổi được Trạng thái/Tiến độ khi tạo task (vì đã ẩn ở form tạo)         | Thấp       | Đúng là yêu cầu nghiệp vụ (task mới không được tạo ở trạng thái "Hoàn thành"); hai trường này vẫn hiện đầy đủ ở form Sửa |
| Mục gập "Thêm chi tiết" đóng mặc định khiến bỏ sót trường (ví dụ Công việc cha) khi tạo nhanh | Trung bình | Tự mở lại khi có lỗi validate rơi vào trường trong mục gập, hoặc khi sửa task đã có dữ liệu ở đó                         |
| Ảnh hưởng dữ liệu/migration do đổi backend                                                    | Không có   | Không đổi backend/schema trong lần này                                                                                   |

## Kiểm chứng

- `npm run typecheck --workspace=apps/web`
- `npm run build:web`
- `npx eslint` trên file đã sửa
- `npm run test` (Vitest)
- Chạy thật qua Chrome: tạo task mới, kiểm tra mặc định Hộp thư đến/0%, mở "Thêm chi tiết", mở lại ở
  chế độ Sửa kiểm tra Trạng thái/Tiến độ hiện ra.

## Kết quả thật (đã làm)

- Tất cả 4 bước kiểm chứng ở trên đều **đã chạy và qua**: typecheck sạch, build qua (chỉ có cảnh báo
  chunk-size cũ không liên quan), eslint sạch, Vitest 18/18 qua.
- Đã chạy thật qua Chrome: tạo task "Kiểm tra form rút gọn" — đúng mặc định Hộp thư đến/0%; mở "Thêm chi
  tiết" hoạt động đúng; mở lại task đó ở chế độ Sửa thấy đúng Trạng thái/Tiến độ.
- Tiện sửa thêm một lỗ hổng cấu hình không liên quan trực tiếp nhưng cần để `npm test` chạy được:
  `packages/shared/tsconfig.json` thiếu `exclude` cho file `*.test.ts` (sót từ lúc thêm Vitest ở phiên
  trước) — đã thêm `exclude`. Không nằm trong phạm vi ban đầu nhưng cần thiết để hoàn thành bước
  kiểm chứng.
- Không có mục nào bị bỏ/đổi so với dự kiến.
- **Chưa commit** — chờ người dùng yêu cầu. Xem chi tiết dòng tương ứng ở
  [`04-nhat-ky-da-lam.md`](../04-nhat-ky-da-lam.md).
