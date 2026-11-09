# 1. Nghiệp vụ từng ứng dụng

> Cập nhật: 2026-11-09 (thêm xóa/gộp/chuyển đoạn + mốc thời gian theo từ, lọc câu hallucination của Whisper
> cho VoiceScribe). Nội dung dựa trên mã nguồn trong repo (backend, `packages/*`, `apps/*`) tại
> thời điểm này. Chỗ nào chưa kiểm chứng trên máy thật được ghi rõ.

Repo `SmartTaskManagers` chứa **4 ứng dụng** dùng chung một kho mã:

| Ứng dụng               | Dành cho ai                 | Nền tảng                         | Backend                                      |
| ---------------------- | --------------------------- | -------------------------------- | -------------------------------------------- |
| **Smart Task Manager** | Một cá nhân (Personal Mode) | Windows, Web, Android (iOS chưa) | ASP.NET Core + MySQL 8 (Railway)             |
| **Content Manager**    | Nhóm làm nội dung           | Web, Windows, Android (iOS chưa) | ASP.NET Core + PostgreSQL (Railway)          |
| **VoiceScribe**        | Người cần chép lời âm thanh | Web, Windows, Android (mới thêm) | Node.js + PostgreSQL + Hugging Face          |
| **App Hub**            | Người cài các app trên      | Windows                          | Không có (đọc `apps-manifest.json` ở GitHub) |

---

## 1. Smart Task Manager

**Mục đích:** quản lý công việc cá nhân. Không có khái niệm Team, Member, Owner hay Department.
Mỗi tài khoản chỉ thấy dữ liệu của chính mình (cách ly bằng EF Core global query filter).

### 1.1 Đối tượng nghiệp vụ

| Đối tượng        | Ý nghĩa                                          | Giá trị cố định                                                                                                                                                                        |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Task**         | Một việc cần làm                                 | Trạng thái: Inbox, To Do, In Progress, Waiting, Completed                                                                                                                              |
|                  |                                                  | Ưu tiên: Critical, Urgent, High, Medium, Low                                                                                                                                           |
|                  |                                                  | Lĩnh vực: Career, Learning, Health, Personal, PersonalAdmin                                                                                                                            |
| **Project**      | Nhóm nhiều task có hạn mục tiêu                  | Sức khỏe dự án: Healthy, Attention, AtRisk. Ưu tiên riêng: Critical/High/Medium/Low (mặc định Medium). Màu (tự gán nếu để trống). Lĩnh vực và Danh mục đều không bắt buộc (2026-11-07) |
| **Goal**         | Mục tiêu dài hạn, có tiến độ %                   | Trạng thái: OnTrack, AtRisk, Completed                                                                                                                                                 |
| **Habit**        | Thói quen lặp lại, có chuỗi (streak) và check-in | Tần suất: Daily, Weekly, Custom                                                                                                                                                        |
| **Notification** | Cảnh báo hệ thống tự sinh                        | Quá hạn, sắp hạn, thói quen sắp mất chuỗi, mục tiêu có rủi ro                                                                                                                          |
| **Session**      | Một thiết bị đang đăng nhập                      | Xem/đăng xuất từng thiết bị trong Cài đặt tài khoản                                                                                                                                    |

Quan hệ: Task thuộc 0 hoặc 1 Project, 0 hoặc 1 Goal, có thể phụ thuộc một Task khác. Xóa Project
hoặc Goal sẽ gỡ liên kết ở các task liên quan chứ không xóa task.

### 1.2 Các màn hình và nghiệp vụ

| Màn hình              | Nghiệp vụ                                                                                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tổng quan**         | Lời chào theo giờ, các chỉ số chính (mặc định: Quá hạn, Đến hạn hôm nay, Đang thực hiện, Tỷ lệ hoàn thành). Người dùng bật thêm chỉ số bằng "Tùy chỉnh".                                                                          |
| **Hôm nay**           | Tập trung hôm nay: việc đã lên lịch giờ, việc đang làm, việc quá hạn, ưu tiên cao, việc dễ xong nhanh.                                                                                                                            |
| **Hộp thư (Inbox)**   | Ghi nhanh một dòng (có phân tích cú pháp: ưu tiên, hạn, dự án), rồi sắp xếp sau vào dự án/hạn.                                                                                                                                    |
| **Công việc**         | Bảng công việc, tab Tất cả/Đang làm/Hoàn thành/Quá hạn, lọc theo dự án/trạng thái/ưu tiên/rủi ro, sắp xếp theo Điểm thông minh. Xuất file.                                                                                        |
| **Dự án**             | Thẻ dự án với số việc theo trạng thái, việc nên làm tiếp, hạn mục tiêu, sức khỏe. Nút "Thêm dự án" ở đầu trang mở form giữa màn hình: Tên (bắt buộc, không trùng), Ưu tiên, Màu, Lĩnh vực, Danh mục, Mô tả/mục tiêu (2026-11-07). |
| **Lịch**              | Xem hạn chót theo Tháng/Tuần/Danh sách; chọn ngày để xem việc trong ngày.                                                                                                                                                         |
| **Kanban**            | Cột theo trạng thái, kéo thả để đổi trạng thái; có gợi ý giới hạn việc làm cùng lúc (WIP).                                                                                                                                        |
| **Gantt**             | Dòng thời gian theo dự án, tiến độ, rủi ro, trễ hạn.                                                                                                                                                                              |
| **Mục tiêu**          | Danh sách mục tiêu, tiến độ %, thêm/sửa/xóa.                                                                                                                                                                                      |
| **Thói quen**         | Check-in hằng ngày/tuần, chuỗi ngày dài nhất.                                                                                                                                                                                     |
| **Phân tích**         | Báo cáo tỷ lệ hoàn thành, quá hạn, tiến độ theo lĩnh vực, phân bố ưu tiên.                                                                                                                                                        |
| **Trợ lý thông minh** | Gom việc theo hành động đề xuất (Làm ngay, Chia nhỏ việc, Việc nhanh, Lên lịch, Để sau…).                                                                                                                                         |
| **Cài đặt**           | 4 tab: Chung, Mặc định công việc, Tập trung & Lịch trình, Công cụ thông minh.                                                                                                                                                     |
| **Tài khoản**         | Ảnh đại diện, đổi mật khẩu, ngôn ngữ (Việt/Anh), giao diện sáng/tối, phiên đăng nhập.                                                                                                                                             |

### 1.3 Smart Engine (quy tắc tính điểm)

Mọi trọng số nằm ở `backend/SmartTask.Application/SmartEngine/SmartWeights.cs`. Điểm không dùng AI,
chỉ là quy tắc cộng điểm có thể giải thích được.

- **Điểm thông minh (SmartScore, 0-100)** cộng từ: độ gấp theo hạn (quá hạn 30, hôm nay 25, sắp hạn 15,
  trong tuần 8), tác động theo ưu tiên (Critical 25, Urgent 20, High 15, Medium 8, Low 3), mức vừa sức
  theo thời lượng (việc rất nhỏ 15 … rất lớn 0), gắn với mục tiêu (+15), tuổi của việc (+1 mỗi 2 ngày,
  tối đa 15).
- **Rủi ro (Risk)** cộng từ: quá hạn 40, hôm nay 25, sắp hạn 10, bị chặn 20, phụ thuộc chưa xong 15,
  đứng yên lâu 15, ưu tiên Critical 10. Ngưỡng: từ 60 là Critical, từ 35 là High, từ 15 là Medium.
- Server **tính lại mỗi ngày** (`DailySmartRecalcHostedService`) và **sinh thông báo mỗi 30 phút**
  (`NotificationGenerationHostedService`).

### 1.4 Đăng nhập và bảo mật nghiệp vụ

- Đăng ký/đăng nhập bằng email + mật khẩu (JWT). Mật khẩu: tối thiểu 8 ký tự, có chữ hoa, chữ thường, số.
- Người dùng **không** tự đổi địa chỉ máy chủ trong app (địa chỉ cố định lúc build).
- Mỗi lần đăng nhập tạo một Session gắn với `jti` của token, để đăng xuất từng thiết bị.

### 1.5 Đồng bộ Google Sheets

Bản gốc là Apps Script (`apps/google-sheets`). Có đồng bộ hai chiều với backend theo nguyên tắc
**bản ghi sửa sau thắng** (last-write-wins). Dành cho ai vẫn muốn dùng Sheets song song.

---

## 2. Content Manager

**Mục đích:** lên lịch và theo dõi nội dung đăng trên nhiều kênh cho một nhóm.

### 2.1 Đối tượng nghiệp vụ

| Đối tượng       | Ý nghĩa                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Workspace**   | Không gian của một nhóm; mọi dữ liệu thuộc về đúng một workspace   |
| **User**        | Thành viên, có vai trò Admin, Editor hoặc Viewer                   |
| **Campaign**    | Chiến dịch: Planned, Active, Done                                  |
| **Content**     | Một bài nội dung: kênh, trạng thái, ưu tiên, ngày đăng, chiến dịch |
| **MediaAsset**  | Tệp ảnh/video đính kèm, có đo dung lượng đã dùng                   |
| **ActivityLog** | Nhật ký hoạt động, hiện ở Tổng quan                                |

- **Kênh:** Facebook, TikTok, YouTube, Website, Zalo.
- **Vòng đời nội dung:** Idea → Drafting → Review → Approved → Scheduled → Published.
- **Ưu tiên:** Low, Medium, High.

### 2.2 Phân quyền (đã có từ bản 0.1.3, ngày 2026-10-27)

| Việc                                          | Admin | Editor | Viewer |
| --------------------------------------------- | :---: | :----: | :----: |
| Xem tất cả                                    |   ✔   |   ✔    |   ✔    |
| Tạo/sửa nội dung, đổi trạng thái, tải tệp lên |   ✔   |   ✔    |        |
| Xóa nội dung, chiến dịch, tệp                 |   ✔   |        |        |
| Quản lý thành viên, vai trò, workspace        |   ✔   |        |        |

Quyền được **kiểm tra ở backend** (`RoleAccess.cs`) và đọc vai trò từ cơ sở dữ liệu mỗi lần gọi, nên đổi
vai trò có hiệu lực ngay. Giao diện ẩn hoặc vô hiệu nút tương ứng (`usePermissions()`), nhưng backend
mới là chỗ chặn thật.

### 2.3 Các màn hình

Tổng quan, Nội dung (danh sách + form), Kanban theo trạng thái (kéo thả), Lịch đăng, Chiến dịch, Thư viện
media, Báo cáo (xuất CSV, hộp thoại chọn nơi lưu), Thành viên, Cài đặt, Tài khoản (có giao diện tối).

---

## 3. VoiceScribe

**Mục đích:** chuyển file ghi âm thành văn bản có mốc thời gian, tách người nói, lưu thư viện.

### 3.1 Luồng nghiệp vụ

1. Đăng ký/đăng nhập (có thể yêu cầu mã đăng ký `SIGNUP_CODE`).
2. **Ghi âm mới:** có hai cách. (a) **Ghi âm trực tiếp** bằng micro: bấm ghi, có thể tạm dừng/tiếp tục,
   bấm dừng thì bản ghi tự được gửi lên và chuyển thành văn bản như file thường (định dạng webm hoặc m4a,
   mono ~64 kbps, tự dừng khi gần chạm giới hạn dung lượng). (b) Chọn file âm thanh (mp3, m4a, wav, mp4,
   webm; dung lượng tối đa theo cấu hình, mặc định 100 MB). Có thể đặt tiêu đề và thư mục.
3. Server cắt file dài thành đoạn bằng ffmpeg, gửi lần lượt lên Hugging Face để chép lời, rồi ghép lại.
   Nếu bật dịch vụ tách người nói (sidecar Python) thì gán nhãn người nói. Xử lý chạy nền, có thanh tiến độ.
   Các câu Whisper "bịa" quen thuộc khi gặp đoạn im lặng/nhiễu (ví dụ "Cảm ơn các bạn đã theo dõi", "hãy
   đăng ký kênh"...) bị lọc bỏ khỏi kết quả theo danh sách biết trước — xem
   `docs/project/plans/2026-11-09-voicescribe-loc-hallucination-whisper.md`.
4. **Thư viện:** tìm kiếm theo tiêu đề/nội dung, lọc theo thư mục, xem chi tiết, xóa.
5. **Chi tiết:** xem chép lời theo đoạn hoặc theo người nói, đổi tên người nói, ghi chú, **xuất Word,
   TXT, SRT**. Trên Android, xuất file mở bảng chia sẻ của hệ thống.
6. **Chỉnh sửa đoạn (chế độ Chỉnh sửa):** xóa đoạn (không hỏi xác nhận, toast "Đã xóa đoạn · Hoàn tác"
   8s + Ctrl+Z), gộp với đoạn trước/sau. Nếu bản ghi có mốc thời gian theo từng từ: bôi chọn chữ rồi
   "Chuyển lên đoạn trước"/"Chuyển xuống đoạn sau" (giữ đúng mốc của chữ di chuyển), "Tách đoạn tại con
   trỏ"; nghe lại 1 đoạn luôn phát đúng chữ hiện có trong đoạn đó (không theo mốc đoạn cũ), tô từng từ
   đang đọc khi phát. Mốc theo từ lấy từ Whisper khi engine hỗ trợ, hoặc nội suy gần đúng khi không —
   xem `docs/project/plans/2026-11-09-voicescribe-xoa-doan-moc-tung-tu.md`.

### 3.2 Đối tượng

User, Folder, Recording (trạng thái xử lý, tiến độ, số người nói, lỗi), Note. Dữ liệu cách ly theo tài khoản.

### 3.3 Giới hạn nghiệp vụ

- Ghi âm trực tiếp cần quyền micro. Chép lời vẫn do Whisper large-v3 xử lý trên server; chưa ép ngôn ngữ
  tiếng Việt và chưa có bước sửa chính tả riêng (xem tài liệu 03).
- Có giới hạn tốc độ đăng nhập (rate limit) và số job chạy đồng thời (`MAX_CONCURRENT_JOBS`, mặc định 2).
- Trên môi trường production, tách người nói **tắt** trừ khi cấu hình `DIARIZATION_SERVICE_URL`.

---

## 4. App Hub

**Mục đích:** một cửa để xem danh sách app, tải và cài/gỡ trên Windows.

- Danh mục lấy từ `apps-manifest.json` trên nhánh `main` của GitHub. Khi không tải được, dùng danh sách
  dự phòng `DEFAULT_APPS` trong `apps/hub/src/data/apps.ts`. **Hai nơi này phải sửa cùng nhau.**
- Với mỗi app và nền tảng: link tải (GitHub Release), phiên bản, **SHA-256** để kiểm tra file, kiểu cài
  (NSIS `.exe` hoặc `.msi`), tham số cài ngầm (`/S` hoặc `/qn`), tên shortcut trong Start Menu.
- Hub kiểm tra SHA-256 trước khi cài. Hub chỉ cài file Windows; không có bản Android.
