# 5. Quy tắc của dự án

> Cập nhật: 2026-11-09 (thêm B5bis: frontend phải chịu được field API mới chưa có trên backend chưa deploy
> kịp). Gom từ cấu hình trong repo (ESLint, Prettier, `.gitignore`, lịch sử commit) và
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

### B5bis. Frontend chịu được backend chưa deploy kịp

- Frontend (đặc biệt app desktop, đóng gói sẵn trong installer) có thể chạy trước khi backend trên Railway
  được deploy field/migration mới tương ứng — deploy Railway là việc của chủ dự án, không tự động theo mỗi
  lần build frontend. Vì vậy **field mới thêm vào response API phải luôn coi là có thể không tồn tại**
  (`undefined`) ở phía frontend, không được giả định luôn có rồi gọi thẳng `.map()`/`.length` lên nó — nếu
  không, cả trang sẽ trắng màn hình (React crash khi render, không có thông báo lỗi) ngay khi gặp backend
  cũ. Luôn có giá trị mặc định (`rec.field ?? []`) ngay tại nơi dữ liệu đi vào từ API, không rải rác việc
  kiểm tra `undefined` khắp nơi. (Bài học 2026-11-09, VoiceScribe Việc B — field `words` chưa có trên
  backend Railway khiến app trắng màn hình, xem tài liệu 04 và
  `plans/2026-11-09-voicescribe-xoa-doan-moc-tung-tu.md`.)

### B5. Test (bắt đầu từ 2026-11-07)

- Backend: xUnit, mỗi project nghiệp vụ (`SmartTask.Application`) có project test riêng cùng cấp
  (`SmartTask.Application.Tests`), thêm vào `SmartTask.slnx`. Dùng fake tay cho interface (`ITaskRepository`,
  `IDateTimeProvider`, `ISmartEngineService`...) đặt ở thư mục `Fakes/` trong project test — **không** thêm
  thư viện mock (Moq/NSubstitute) trừ khi fake tay không còn đủ. Chạy: `dotnet test` (từ `backend/`).
- Frontend: Vitest, một `vitest.config.ts` ở gốc repo quét `packages/*/src/**/*.test.ts(x)` — không cần config
  riêng cho từng package. Test đặt cạnh file nguồn (`tenFile.test.ts` cạnh `tenFile.ts`). Chạy: `npm test` (từ gốc).
- Test mới chỉ bắt buộc cho logic nghiệp vụ không hiển nhiên (quy tắc validate, thuật toán, parser) — không bắt
  buộc viết test cho mọi thành phần UI thuần hiển thị.

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
6. Thêm cột mới vào bảng có dữ liệu thật: migration EF phải đặt `defaultValue` là **một giá trị enum hợp
   lệ** (không phải chuỗi rỗng `""`), nếu không hàng cũ sẽ lỗi khi đọc do `HasConversion<string>()` không
   parse được chuỗi rỗng. Thêm **UNIQUE INDEX** trên cột đã có dữ liệu trùng sẽ làm migration thất bại khi
   deploy — kiểm tra trùng lặp trước khi thêm (ứng dụng này tự `MigrateAsync()` khi khởi động, xem
   `SmartTask.Api/Program.cs`, nên migration lỗi sẽ chặn app khởi động). (Bài học 2026-11-07.)

## E. Thỏa thuận làm việc với trợ lý AI

Đây là thỏa thuận giữa chủ dự án và trợ lý, **không có công cụ nào ép**:

- Trợ lý trả lời bằng **tiếng Việt, ngắn gọn, trung thực** về cái đã và chưa kiểm chứng.
- **Chỉ commit khi được yêu cầu. Khi được yêu cầu commit thì push luôn** — không cần đợi nói "push" riêng
  (khác với rule cũ "chỉ push khi nói rõ push"; rule này đã được thay bằng rule này).
- **"Build lại" ≠ "build".** "Build lại" nghĩa là: đang ở máy khác (máy mới), chỉ cần build ra đúng artifact
  mà máy kia **đã build trước đó** (cùng version, không bump version, không tạo release mới) — dùng khi đổi
  máy làm việc và cần dựng lại y như cũ để tiếp tục. "Build" (không có "lại") vẫn giữ nguyên nghĩa ở mục
  "build nghĩa là bump version mới..." trong `CLAUDE.md` — bump version, build web + Tauri thật, tạo tag/release
  sau khi hỏi xác nhận. Hai lệnh này **khác nhau**, không được hiểu lẫn.
- **Xung đột khi push/pull (đổi máy làm việc):** nếu máy cũ chưa push mà máy mới đã sửa y chang và push
  trước, thì khi máy cũ pull/push lại bị xung đột (conflict) — **luôn chọn bản đã push trước** (bản của máy
  mới trong ví dụ này), không chọn bản local chưa push của máy đang thao tác. Nói cách khác: bản đã lên remote
  trước thắng; bản local chưa từng push bị discard khi xung đột với nó. Nếu không chắc máy nào đã push trước,
  phải hỏi lại chủ dự án trước khi quyết, không tự chọn.
- Việc trên dashboard Railway, tạo GitHub Release, cấp khóa ký: **do chủ dự án làm**, trừ trường hợp rule
  "build" ở `CLAUDE.md` cho phép trợ lý tự tạo Release sau khi hỏi xác nhận.
- Không sửa hay xóa dữ liệu trong cơ sở dữ liệu thật (PostgreSQL/MySQL).
- Không in hay chia sẻ bí mật của chủ dự án.
- Hành động khó hoàn tác hoặc ảnh hưởng người ngoài (xóa, phát hành) phải được hỏi trước. Push sau khi commit
  theo yêu cầu thì không cần hỏi lại riêng (xem rule push ở trên), nhưng force-push vẫn luôn phải hỏi.
- **Sau mỗi lần làm việc, trợ lý phải cập nhật `docs/project/`** (ít nhất `04-nhat-ky-da-lam.md`: làm gì, ngày, mã commit, đã/chưa kiểm chứng gì). Quy tắc này nằm trong `CLAUDE.md` ở gốc repo để mỗi phiên đều tự động nạp.
- Thay đổi chỉ nên làm đúng phạm vi được yêu cầu; việc phát sinh thì báo, không tự mở rộng.
