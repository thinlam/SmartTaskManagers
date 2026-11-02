# 5. Quy tắc của dự án

> Cập nhật: 2026-11-01 (thêm quy tắc cập nhật docs sau mỗi lần làm việc). Gom từ cấu hình trong repo (ESLint, Prettier, `.gitignore`, lịch sử commit) và
> từ các thỏa thuận làm việc giữa chủ dự án và trợ lý AI. Mục nào là thỏa thuận (không có công cụ ép) được ghi rõ.

## A. Quy tắc bắt buộc, có công cụ kiểm tra

| Quy tắc                                                                           | Công cụ / lệnh      |
| --------------------------------------------------------------------------------- | ------------------- |
| Mã TypeScript phải qua kiểm tra kiểu cho **mọi** app trước khi commit             | `npm run typecheck` |
| ESLint phải sạch ở phần mình sửa                                                  | `npm run lint`      |
| Định dạng bằng Prettier; chỉ chạy `prettier --write` trên **đúng tệp mình sửa**   | `npm run format`    |
| Không để công cụ Node đụng vào `apps/google-sheets` và `apps/excel` (Apps Script) | `.prettierignore`   |
| `Cargo.lock` **được commit** (app Tauri là chương trình, cần build lặp lại được)  | `.gitignore`        |
| Không commit `.env`, `node_modules`, `dist`, `bin/obj`, `target`, tệp `*.local`   | `.gitignore`        |

> Cảnh báo thực tế: chạy `prettier --write` trên **cả thư mục** sẽ định dạng lại cả tệp không liên quan
> và làm diff lớn vô nghĩa. Hãy chỉ truyền đường dẫn tệp đã sửa. Nếu lỡ, dùng `git checkout -- <tệp>`.

## B. Quy tắc về mã nguồn

### B1. Cấu trúc

- **Monorepo npm workspaces:** `apps/*` là vỏ chạy (shell), `packages/*` là mã dùng chung. Mã giao diện dùng
  chung phải nằm ở `packages/*`, không chép vào từng app.
- `packages/ui` chỉ là thành phần trình bày, **không có i18n**. Trang gọi nó phải truyền nhãn đã dịch
  (qua `translatePriority`, `translateTaskStatus`, `translateRisk` ở `packages/app-core/src/lib/enumLabels.ts`).
- `packages/shared` chứa hàm thuần (tính toán số liệu). Chữ hiển thị sinh ra trong đó **dùng tiếng Việt cố định**
  và ngày `vi-VN`, giờ 24h. Khóa dữ liệu của backend (như tên hành động Smart Engine) **không** được dịch ở đây, chỉ
  dịch ở lớp hiển thị.
- Backend Smart Task Manager theo Clean Architecture: `Api` → `Application` → `Domain`, `Infrastructure`, `Persistence`.

### B2. Giao diện

- **Ngôn ngữ mặc định là tiếng Việt**; khóa i18n phải có ở **cả** `vi.json` và `en.json`.
- Thiết kế theo token ở `packages/ui/src/styles/theme.css`; chế độ tối dùng biến CSS `.dark`, **không** dùng
  tiện ích `dark:`.
- Màn hình điện thoại: dùng `--sat/--sab/--sal/--sar` (vùng an toàn), không dùng riêng `env(...)`.
  Thao tác chỉ hiện khi rê chuột phải có `[@media(pointer:coarse)]:opacity-100` để dùng được trên cảm ứng.
- Xóa dữ liệu phải có **xác nhận** bằng hộp thoại trong app (`ConfirmDialog`), không dùng `window.confirm`.
- Tránh thao tác thừa: không nhân bản cùng một dãy số liệu ở nhiều trang; mỗi trang một dòng tóm tắt là đủ.
- Hành động phụ (sửa/xóa) ẩn đến khi cần; hành động chính (hoàn thành, thêm) luôn thấy.

### B3. Phân quyền và dữ liệu

- **Quyền phải kiểm ở backend.** Ẩn nút ở giao diện chỉ để dễ dùng, không phải bảo mật.
  Content Manager đọc vai trò từ cơ sở dữ liệu mỗi lần gọi (`RoleAccess.RequireRole`).
- Dữ liệu cách ly theo tài khoản bằng global query filter ở tầng database (Smart Task Manager) hoặc theo workspace
  (Content Manager). Không viết truy vấn bỏ qua filter này.
- **Người dùng không tự chỉnh địa chỉ máy chủ** trong app. Địa chỉ là hằng số lúc build (`VITE_*`).
- Xuất file phải cho người dùng **chọn nơi lưu** (hộp thoại lưu trên desktop, bảng chia sẻ trên Android).

### B4. Bí mật

- **Tuyệt đối không** đưa vào Git hay dán vào chat: `HF_TOKEN`, `JWT_SECRET`/`Jwt__Secret`, `SIGNUP_CODE`, chuỗi kết nối
  cơ sở dữ liệu, khóa ký APK/keystore, chứng chỉ Apple. Chúng nằm ở Railway/Codemagic.
- Địa chỉ API công khai (`https://...up.railway.app`) **không** phải bí mật và được phép nằm trong
  `codemagic.yaml` và các `.env.production` được commit.
- Mật khẩu người dùng: tối thiểu 8 ký tự, có chữ hoa, chữ thường và số; luôn có ô nhập lại khi đăng ký.

## C. Quy tắc Git

- Nhánh làm việc chính: `main`. Commit nhỏ, đặt tên theo **Conventional Commits** như lịch sử hiện có:
  `feat(phạm-vi): ...`, `fix(phạm-vi): ...`, `chore(phạm-vi): ...`, `docs: ...`.
  Phạm vi thường dùng: `app`, `hub`, `content-manager`, `voicescribe`, `codemagic`, `android`, `backend`.
- Commit bump phiên bản dùng mẫu: `chore(<app>): bump desktop to X.Y.Z`.
- Commit do trợ lý AI tạo kết thúc bằng dòng `Co-Authored-By: ...` theo cấu hình phiên làm việc.
- Không commit tệp tạm của công cụ (log, `*.log`, thư mục `scratchpad`, ảnh chụp kiểm thử).
- **Không** dùng `git stash` rồi `git stash pop` để "thử nhanh" trên kho có stash sẵn của người khác: `pop` sẽ lấy stash
  cũ nhất. (Bài học 2026-11-01, xem tài liệu 04.)

## D. Quy tắc phát hành

1. Mỗi lần phát hành desktop: nâng phiên bản ở `tauri.conf.json` và `Cargo.toml` → build → push → **chủ dự án tạo Release**
   trên GitHub → kiểm tra dung lượng và SHA-256 → cập nhật Hub.
2. Hub phải sửa **cả** `apps-manifest.json` **và** `apps/hub/src/data/apps.ts`. Thiếu một nơi là lỗi.
3. Link tải trên Hub trỏ vào **tag cụ thể**, không dùng `/latest/`.
4. Không đánh dấu "đã xong" khi chưa chạy thật. Báo rõ cái gì đã kiểm chứng và cái gì chưa.
5. Sửa backend (CORS, logic) chỉ có hiệu lực sau khi **redeploy** trên Railway.

## E. Thỏa thuận làm việc với trợ lý AI

Đây là thỏa thuận giữa chủ dự án và trợ lý, **không có công cụ nào ép**:

- Trợ lý trả lời bằng **tiếng Việt, ngắn gọn, trung thực** về cái đã và chưa kiểm chứng.
- **Chỉ commit khi được yêu cầu. Chỉ push sau khi chủ dự án nói rõ "push".**
- Việc trên dashboard Railway, tạo GitHub Release, cấp khóa ký: **do chủ dự án làm**.
- Không sửa hay xóa dữ liệu trong cơ sở dữ liệu thật (PostgreSQL/MySQL).
- Không in hay chia sẻ bí mật của chủ dự án.
- Hành động khó hoàn tác hoặc ảnh hưởng người ngoài (push, xóa, phát hành) phải được hỏi trước.
- **Sau mỗi lần làm việc, trợ lý phải cập nhật `docs/project/`** (ít nhất `04-nhat-ky-da-lam.md`: làm gì, ngày, mã commit, đã/chưa kiểm chứng gì). Quy tắc này nằm trong `CLAUDE.md` ở gốc repo để mỗi phiên đều tự động nạp.
- Thay đổi chỉ nên làm đúng phạm vi được yêu cầu; việc phát sinh thì báo, không tự mở rộng.
