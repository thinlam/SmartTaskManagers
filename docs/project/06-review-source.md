# 6. Bảng review toàn bộ mã nguồn

> Ngày review: 2026-11-01, commit nền `addec05`.
>
> **Phạm vi và giới hạn, đọc trước khi dùng bảng này:**
>
> - Đây là review **cấp cấu trúc và kiểm tra tự động**, không phải đọc từng dòng. Tổng cộng khoảng **66.000 dòng**
>   (TS/TSX/C#/Apps Script/JS), trong đó **30.221 dòng là Apps Script** của bản Google Sheets cũ.
> - Các dòng đếm **không** gồm: migration EF, mã sinh của Android/iOS, tệp `.d.ts`, mã Rust trong `src-tauri`.
> - Kết quả "đạt/không đạt" dưới đây là của lệnh đã chạy ngày review. Phần chưa chạy được ghi rõ.
> - Những mục tôi chưa mở đọc kỹ ghi là "chưa đọc kỹ", không suy đoán.

## 1. Kết quả kiểm tra tự động (đã chạy 2026-11-01)

| Kiểm tra                                                | Kết quả                                                                                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run typecheck` (mọi workspace TS)                  | **Đạt**, không lỗi                                                                                  |
| `eslint` cho `packages`, `apps/hub`, `apps/voicescribe` | **5 lỗi** (đều ở VoiceScribe, xem F2). Hai cảnh báo ở `app-core` đã được sửa trong cùng đợt         |
| `eslint packages/app-core`                              | **Sạch** sau khi sửa                                                                                |
| Prettier trên mã mới sửa                                | **Đạt**. Chạy trên toàn thư mục `apps/voicescribe` thì lỗi vì quét cả `.venv` (không phải mã dự án) |
| Kiểm thử tự động (unit/integration)                     | **Không có** (xem F1)                                                                               |
| Biên dịch Android (Gradle)                              | **Chưa chạy được** trên máy này (cần JDK 21, máy có JDK 17)                                         |
| Biên dịch backend .NET                                  | **Chưa chạy** trong đợt review này                                                                  |
| `TODO/FIXME/HACK` trong `.ts/.tsx/.cs`                  | 0                                                                                                   |

## 2. Bảng review theo khu vực

| Khu vực                            |   Dòng | Vai trò                                      | Typecheck |  Test   | Nhận xét chính                                                                                    |
| ---------------------------------- | -----: | -------------------------------------------- | :-------: | :-----: | ------------------------------------------------------------------------------------------------- |
| `packages/app-core`                |  9.254 | Trang, routing, state của Smart Task Manager |    Đạt    |  Không  | Phần lớn công sức giao diện. Đã rà soát kỹ ở 4 vòng ngày 2026-10-28                               |
| `packages/ui`                      |  2.179 | Thành phần trình bày dùng chung              |    Đạt    |  Không  | Không i18n, nhận nhãn qua props. Một số vùng an toàn còn dùng `env()` trực tiếp (xem F6)          |
| `packages/shared`                  |  2.407 | Hàm thuần tính số liệu                       |    Đạt    |  Không  | **Rất hợp để viết test đầu tiên** vì là hàm thuần                                                 |
| `packages/api-client`              |    549 | Gọi API, ánh xạ DTO                          |    Đạt    |  Không  | Chưa đọc kỹ                                                                                       |
| `packages/types`, `hooks`          |    679 | Kiểu và hook                                 |    Đạt    |  Không  | Chưa đọc kỹ                                                                                       |
| `packages/cm-core`                 |  6.419 | Toàn bộ giao diện Content Manager            |    Đạt    |  Không  | Đã có phân quyền theo vai trò, vùng an toàn điện thoại                                            |
| `apps/desktop`, `web`              |     88 | Vỏ mỏng bọc `app-core`                       |    Đạt    |  Không  | Đúng thiết kế, không có logic                                                                     |
| `apps/content-web`, `desktop`      |     77 | Vỏ mỏng bọc `cm-core`                        |    Đạt    |  Không  | Như trên                                                                                          |
| `apps/hub`                         |  1.796 | Trình cài đặt, máy trạng thái cài/gỡ         |    Đạt    |  Không  | Có kiểm SHA-256. Danh mục nhân đôi (F4)                                                           |
| `apps/voicescribe/src`             |  2.034 | Backend Node: auth, chép lời, ghép người nói |    Đạt    |  Không  | Có rate limit, giới hạn job song song. Có 1 lỗi lint (F2)                                         |
| `apps/voicescribe/web`             |  3.398 | Giao diện VoiceScribe                        |    Đạt    |  Không  | Mới thêm bố cục điện thoại. 4 lỗi lint (F2). Trang chi tiết bản ghi chưa xem ở khổ nhỏ            |
| `backend/SmartTask.Api`            |  1.628 | Controller, dịch vụ nền, health              |  (chưa)   |  Không  | Chưa biên dịch trong đợt này                                                                      |
| `backend/SmartTask.Application`    |  2.799 | Nghiệp vụ, Smart Engine                      |  (chưa)   |  Không  | Trọng số rõ ràng trong `SmartWeights.cs`. **Nên có test** vì là logic tính điểm                   |
| `backend/SmartTask.Domain`         |    399 | Thực thể, enum                               |  (chưa)   |  Không  | Gọn                                                                                               |
| `backend/SmartTask.Persistence`    |    689 | EF Core, MySQL                               |  (chưa)   |  Không  | Có retry migration khi khởi động trên Railway                                                     |
| `backend/SmartTask.Infrastructure` |    157 | Bảo mật, thời gian                           |  (chưa)   |  Không  | Chưa đọc kỹ                                                                                       |
| `backend/ContentManager.Api`       |  1.194 | API Content Manager (PostgreSQL)             |  (chưa)   |  Không  | `RoleAccess` đúng hướng. Chưa đọc kỹ `MiscEndpoints.cs`                                           |
| `apps/google-sheets`               | 30.221 | Bản Apps Script gốc                          | Ngoài TS  |  Không  | Chiếm ~46% tổng dòng; nằm ngoài typecheck và Prettier. Nguồn gốc của nhiều quy tắc (Smart Engine) |
| Android (3 dự án Capacitor)        | (sinh) | Vỏ APK                                       |    n/a    | Chỉ mẫu | `MainActivity` tự viết chưa biên dịch (F5). Chỉ có bản debug                                      |

## 3. Phát hiện cụ thể

Mức: **Cao** = nên làm trước khi phát hành rộng; **Vừa** = nên làm trong vài tuần; **Thấp** = dọn dẹp.

| Mã  | Mức  | Phát hiện                                                                                                                                                                                                                                         | Bằng chứng                                                                                      | Đề xuất                                                                            |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| F1  | Cao  | **Không có kiểm thử tự động.** Mọi thay đổi chỉ kiểm bằng tay. Phân quyền, tính điểm, ghép người nói đều chưa có test                                                                                                                             | Tìm `*.test.*`, `*.spec.*`, `Tests.csproj`: chỉ ra các tệp mẫu của Capacitor                    | Bắt đầu từ `packages/shared`, `SmartEngine`, `RoleAccess`, `mergeSpeakers`         |
| F2  | Vừa  | **Lint của VoiceScribe có 5 lỗi:** 4 lỗi `Definition for rule 'react-hooks/exhaustive-deps' was not found` (cấu hình ESLint không nạp plugin React hooks nhưng mã có chú thích tắt luật) và 1 lỗi `no-control-regex` ở `utils/filename.ts` dòng 7 | Chạy `eslint` ngày 2026-11-01                                                                   | Thêm plugin `react-hooks` vào cấu hình, hoặc bỏ chú thích; kiểm tra regex có chủ ý |
| F3  | Thấp | **Tài liệu lệch thực tế:** `docs/roadmap/ROADMAP.md` ghi Phase 21 dùng SQL Server, nhưng mã đã chuyển sang MySQL từ 2026-09-22; Roadmap cũng dừng ở Phase 34                                                                                      | Commit `migrate persistence from SQL Server to MySQL (Railway)`; `UseMySql` trong `Persistence` | Cập nhật Roadmap                                                                   |
| F4  | Vừa  | **Danh mục Hub nhân đôi:** `apps-manifest.json` và `apps/hub/src/data/apps.ts` phải sửa cùng nhau; quên một nơi là lỗi âm thầm                                                                                                                    | Quy trình phát hành (tài liệu 02)                                                               | Sinh `apps.ts` từ manifest khi build, hoặc thêm bước kiểm tra tự động              |
| F5  | Vừa  | **`MainActivity.java` (3 app) chưa từng biên dịch.** Đệm cửa sổ theo vùng an toàn ở tầng gốc; chưa thấy trên máy thật                                                                                                                             | Máy chỉ có JDK 17, cần 21                                                                       | Build Codemagic, xem log, thử trên điện thoại                                      |
| F6  | Thấp | **Nền vùng đệm Android theo chế độ tối của hệ thống, không theo cài đặt trong app** (Content Manager có giao diện tối riêng). Có thể lệch màu                                                                                                     | Thiết kế của `MainActivity`                                                                     | Truyền màu nền từ app sang native, hoặc nâng Capacitor 8 (có SystemBars)           |
| F7  | Vừa  | **Chỉ có APK debug**, chưa ký bản release                                                                                                                                                                                                         | `./gradlew assembleDebug` trong `codemagic.yaml`                                                | Tạo keystore (chủ dự án giữ), thêm bước ký                                         |
| F8  | Thấp | **Dòng cuối tệp lẫn CRLF/LF.** Nhiều tệp VoiceScribe dùng CRLF; Git cảnh báo "CRLF will be replaced by LF"                                                                                                                                        | Cảnh báo `git commit`                                                                           | Thêm `.gitattributes` với `* text=auto eol=lf`                                     |
| F9  | Vừa  | **Bản Google Sheets (30.221 dòng) nằm ngoài mọi kiểm tra** (typecheck, lint, Prettier). Nếu còn dùng, rủi ro lệch với backend                                                                                                                     | `.prettierignore`, không có trong `typecheck`                                                   | Quyết định giữ hay đóng băng; nếu giữ, thêm kiểm thử đồng bộ                       |
| F10 | Thấp | **Khóa dịch có thể thừa** sau các vòng làm lại giao diện (ví dụ `inbox.statOldestItem*`, `tasks.stat*`, `kanban.stat*`)                                                                                                                           | Các thẻ số liệu tương ứng đã bị bỏ; chưa chạy công cụ tìm khóa thừa                             | Quét và xóa khóa không còn dùng                                                    |
| F11 | Thấp | **Thiếu quy tắc `.gitignore` cho `ffmpeg-shared/` và `__pycache__` trong `apps/voicescribe/diarization-service`.** Một stash của GitHub Desktop từng chứa 216 tệp ffmpeg/pyc ở đó                                                                 | `git check-ignore` chỉ bắt `.venv`; `ffmpeg-shared` không bị bỏ qua                             | Thêm hai mục vào `.gitignore` của thư mục đó                                       |
| F12 | Thấp | **Lint và `npm run format` quét cả `.venv` của dịch vụ tách người nói**, gây lỗi "Invalid string length" khi chạy Prettier trên cả `apps/voicescribe`                                                                                             | Chạy Prettier ngày 2026-11-01                                                                   | Thêm `diarization-service/.venv` vào `.prettierignore` và ESLint ignore            |
| F13 | Vừa  | **Chưa có chế độ ngoại tuyến.** App cần mạng; backend Railway ngủ sẽ làm lần mở đầu chậm hoặc lỗi                                                                                                                                                 | Kiến trúc (mọi dữ liệu qua API)                                                                 | Cân nhắc bộ nhớ đệm cục bộ; hiển thị trạng thái "đang kết nối" rõ ràng             |

## 4. Điểm tốt đã xác nhận

| Điểm                                                                                                                                                                                                     | Bằng chứng                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Typecheck sạch trên toàn bộ workspace TS                                                                                                                                                                 | `npm run typecheck` thoát mã 0                       |
| **Không có bí mật nào trong tệp cấu hình đã commit:** `appsettings.json` của Smart Task Manager không có khóa ký; Content Manager để `Secret` rỗng và **từ chối khởi động** nếu thiếu hoặc dưới 32 ký tự | Đọc `appsettings*.json`, `Program.cs`                |
| Phân quyền Content Manager kiểm ở backend và đọc vai trò từ database mỗi lần gọi                                                                                                                         | `RoleAccess.cs`                                      |
| Cách ly dữ liệu theo tài khoản bằng query filter tầng database                                                                                                                                           | README, commit 2026-09-23                            |
| Hub kiểm SHA-256 trước khi cài                                                                                                                                                                           | `apps/hub/src/lib/installManager.ts`                 |
| Retry migration khi khởi động (API và MySQL không khởi động cùng lúc trên Railway)                                                                                                                       | `SmartTask.Api/Program.cs`, mục "DATABASE MIGRATION" |
| Smart Engine có trọng số tập trung, đặt tên rõ                                                                                                                                                           | `SmartWeights.cs`                                    |
| Có giới hạn tốc độ đăng nhập và giới hạn job song song ở VoiceScribe                                                                                                                                     | `auth/rateLimit.ts`, `MAX_CONCURRENT_JOBS`           |
| Kiến trúc dùng chung `packages/*` giữ các vỏ app rất mỏng (33 đến 88 dòng)                                                                                                                               | Đếm dòng ở mục 2                                     |

## 5. Thứ tự xử lý đề xuất

1. **F1** (test), bắt đầu từ `packages/shared` và `RoleAccess`, vì rẻ và chống hồi quy cho phần dễ hỏng nhất.
2. **F5** rồi **F7**: biên dịch Android thật, sau đó ký bản release.
3. **F2**, **F12**, **F8**, **F11**: dọn lint và cấu hình ignore trong một commit nhỏ.
4. **F4**: chống quên khi phát hành Hub.
5. Còn lại theo kế hoạch ở [tài liệu 03](03-ke-hoach.md).
