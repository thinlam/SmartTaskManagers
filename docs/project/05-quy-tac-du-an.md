# 5. Quy tắc của dự án

> Cập nhật: 2026-11-22 (thêm E1 — quy tắc kiểm tra & cài đủ công cụ/gói khi làm việc trên máy mới).
> Gom từ cấu hình trong repo (ESLint, Prettier, `.gitignore`, lịch sử commit) và
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

### B1bis. Cấu trúc backend theo loại database (từ 2026-11-19)

- Project dùng PostgreSQL: `appsettings*.json` chỉ chứa cấu hình Postgres (provider Npgsql, connection string
  dạng Postgres). Project dùng MySQL: chỉ chứa cấu hình MySQL (provider Pomelo/Microting.EntityFrameworkCore.MySql,
  `Database:ServerVersion`...). Không để cấu hình của DB này lẫn trong project của DB kia.
- Các project .NET cùng loại DB gom chung vào một folder theo DB, mỗi project một folder con riêng, ví dụ:
  ```
  backend/
    postgres/
      ContentManager.Api/
      <dự-án-postgres-khác>/
    mysql/
      SmartTask.*/
  ```
  Áp dụng cho **project mới** tạo từ giờ. Các project đã có (SmartTask ở `/backend`, ContentManager.Api ở
  `/backend/ContentManager.Api`) **không tự di chuyển** — di chuyển folder sẽ làm hỏng Root Directory trên
  Railway và đường dẫn Dockerfile/CI; phải lập danh sách ảnh hưởng (Railway, Dockerfile, `codemagic.yaml`,
  script npm, docs) và hỏi chủ dự án trước khi di chuyển.
- VoiceScribe là Node.js (không có `appsettings`): quy tắc tương đương là `.env.example` chỉ có biến
  PostgreSQL (`DATABASE_URL`).
- Vẫn giữ quy tắc bí mật mục B4: không commit connection string hay secret trong appsettings.
- **Lưu ý lệch tài liệu (chưa tự sửa):** `ARCHITECTURE.md` ghi Smart Task Manager dùng SQL Server, trong khi
  `backend/README.md` và README gốc ghi MySQL — thực tế code (`UseMySql`, `Database:ServerVersion` mặc định
  `8.0.0-mysql`) xác nhận SmartTask dùng **MySQL**. Cần chủ dự án xác nhận và sửa `ARCHITECTURE.md`.

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

### B5ter. Mọi hook React phải gọi trước early-return

- Trong component có `if (!x) return ...` (ví dụ chờ dữ liệu tải xong, hoặc báo lỗi), **tất cả**
  `useEffect`/`useMemo`/`useCallback`/`useState` phải được khai báo **phía trên** mọi `return` sớm đó —
  không được thêm hook mới ở phần code nằm sau early-return, dù code đó "chỉ chạy khi có dữ liệu". Vi phạm
  Rules of Hooks kiểu này không báo lỗi lúc code/typecheck, chỉ crash lúc chạy thật (React error #310, "Rendered
  more hooks than during the previous render") — và nếu app release đã tắt DevTools thì **trắng màn hình hoàn
  toàn không có thông báo gì**. Khi thêm hook mới vào một component đã có early-return, luôn kiểm tra lại vị
  trí đặt hook trước khi coi là xong. (Bài học 2026-11-09, VoiceScribe desktop 0.2.10 → 0.2.11 — 2 `useEffect`
  của tính năng hoàn tác xóa đoạn bị đặt sau `if (!rec) return`, xem tài liệu 04.)

### B5quater. VoiceScribe: không dựng `text` cuối cùng chỉ từ `chunks`, luôn có đường lùi về `output.text` (từ 2026-11-19)

- Hugging Face Inference Provider cho ASR (`automaticSpeechRecognition`) có thể trả về `output.text`
  đầy đủ, đúng nhưng `output.chunks` **hoàn toàn vắng mặt** (không phải mảng rỗng, mà là tham số
  `return_timestamps` bị provider bỏ qua) — quan sát thật với provider `deepinfra`, model
  `openai/whisper-large-v3`, lặp lại ổn định trên nhiều đoạn khác nhau của cùng file. Nếu code dựng
  `text` cuối cùng chỉ từ `segments` (suy ra từ `chunks`) mà không có đường lùi, gặp trường hợp này sẽ
  **mất trắng bản ghi đúng** dù `output.text` có sẵn — hiện tượng ngoài giao diện là "Kết quả nhận dạng
  trống" dù file nghe rõ tiếng nói. Đã sửa trong `transcription.ts`: khi `chunks.length === 0`, dựng 1
  segment duy nhất thẳng từ `output.text` (không có timestamp theo từ, chấp nhận mất độ chi tiết đó còn
  hơn mất cả nội dung).
- Tách riêng 2 cơ chế retry không dùng chung ngân sách: lỗi mạng/HTTP (429/5xx) dùng `MAX_RETRIES` với
  backoff luỹ thừa; kết quả "gọi thành công nhưng rỗng" (không phải lỗi mạng, provider trả 200 với text
  rỗng) dùng `EMPTY_RESULT_MAX_RETRIES` riêng, số lần nhỏ hơn và delay cố định ngắn hơn — vì file dài bị
  chia nhỏ 30s có nhiều đoạn **im lặng thật** (khoảng nghỉ giữa câu), áp cùng backoff của lỗi mạng cho mọi
  đoạn rỗng sẽ làm toàn bộ việc xử lý file dài chậm đi vô ích.
- Khi gặp log kiểu "Kết quả nhận dạng trống" trên file đã xác nhận có giọng nói rõ: trước khi nghi ngờ
  file hỏng, kiểm tra `output.chunks` có rỗng/vắng mặt trong khi `output.text` có nội dung không — đây là
  dấu hiệu của đúng bug này, không phải lỗi âm thanh.

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

### C4. Mỗi chức năng/app một nhánh riêng (từ 2026-11-19)

- Mỗi lần làm chức năng mới hoặc app mới, tạo một nhánh riêng cho chức năng/app đó, tách từ `main`.
- Đặt tên: `feat/<app>-<chức-năng>`, ví dụ `feat/content-manager-calendar-view`. Sửa lỗi dùng `fix/<app>-<mô-tả>`.
- Không làm trực tiếp trên `main`. Không gộp nhiều chức năng không liên quan vào một nhánh.

### C5. Test trên nhánh riêng, chỉ merge `main` khi chủ dự án bảo (từ 2026-11-19)

- `main` tự động deploy (Railway theo dõi `main`). Vì vậy mọi thứ vào `main` phải là code đã được chủ dự án
  test và duyệt.
- Khi cần test với database hoặc fake dữ liệu đầy đủ, tạo một nhánh test riêng từ nhánh chức năng, ví dụ
  `test/<app>-<chức-năng>`.
  - Dữ liệu fake, seed, cấu hình test chỉ nằm ở nhánh test, không được vào `main`.
  - Nhánh test chỉ trỏ vào database test, không bao giờ trỏ vào database thật (khớp mục E: không sửa/xóa
    dữ liệu DB thật).
- Chủ dự án tự test trên nhánh đó. Chỉ khi chủ dự án nói rõ "merge sang main" thì mới merge, và chỉ merge
  phần code chức năng đã sạch (không kèm dữ liệu fake/seed/cấu hình test).
- Không tự merge, không tự push `main`. Nếu không chắc nhánh nào sẽ tự deploy, phải hỏi trước.

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

### E1. Máy mới: kiểm tra & cài đủ công cụ/gói trước khi làm (từ 2026-11-22)

Trước khi làm bất kỳ việc gì trên một máy/phiên chưa từng xác nhận môi trường (đổi máy, phiên mới, máy
lạ), bước đầu tiên là kiểm tra nhanh các công cụ/gói cần cho **đúng phần việc sắp làm** (không cần kiểm
tra toàn bộ nếu việc chỉ liên quan 1 phần):

1. Node.js/npm (`node --version`/`npm --version`) — nếu không chạy dù `node_modules` đã có, tìm `node.exe`
   trong máy (PATH shell có thể thiếu dù Node đã cài — bài học 2026-11-20) trước khi kết luận chưa cài.
2. `npm install` ở root monorepo nếu thiếu `node_modules`.
3. .NET SDK (`dotnet --version`, `dotnet restore`) cho backend.
4. Rust/Cargo/Tauri CLI — chỉ khi sẽ build app desktop.
5. Docker đang chạy — chỉ khi cần database local.
6. Git identity (`user.name`/`user.email`) — nếu `git commit` báo "Author identity unknown", set **chỉ
   trong repo này** (không `--global`) khớp đúng tác giả đã có trong lịch sử commit (bài học 2026-11-21).
7. `gh` CLI — chỉ khi cần tạo GitHub Release.

Chỉ cài/thiết lập đúng phần còn thiếu theo việc sắp làm, không cài dư thừa.

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
