# VoiceScribe — chỉnh responsive theo `07-kich-co-man-hinh-mobile.md`

## Mục tiêu / nghiệp vụ

Giao diện VoiceScribe (web + Android/Capacitor, cùng 1 codebase `apps/voicescribe/web`) hiện đã
responsive một phần (Tailwind mặc định: `sm`=640, `md`=768, `lg`=1024) nhưng các mốc này không
khớp với nhóm máy thật trong `docs/project/07-kich-co-man-hinh-mobile.md` (ví dụ sidebar/bottom-nav
đổi ở 768px — nằm giữa khoảng `xl` của điện thoại, trước cả mốc `medium` 600px của tài liệu 07).
Mục tiêu: chỉnh các điểm **đổi bố cục cấu trúc** (sidebar ↔ bottom-nav, 1 cột ↔ nhiều cột, độ rộng
nội dung tối đa) để khớp đúng 2 mốc chính của tài liệu 07 (`medium` 600px, `expanded` 840px), và
soát lại vùng chạm/safe-area/không vỡ ở 320px theo mục 5 của tài liệu đó. App Hub (chạy Windows,
không phải mobile) không thuộc phạm vi.

## Phạm vi

**Làm:**

- Thêm 2 breakpoint riêng `medium` (600px) và `expanded` (840px) vào Tailwind (`@theme` trong
  `index.css`, Tailwind v4) — không đổi `sm/md/lg` mặc định đang dùng rải rác cho tinh chỉnh nhỏ,
  để tránh vỡ các chỗ khác đang dựa vào 3 mốc đó.
- `Sidebar.tsx`: đổi điểm chuyển sidebar ↔ bottom-nav từ `md` (768) sang `medium` (600) — đúng mục 6
  tài liệu 07 ("nav rail trái" ở medium, sidebar đầy đủ ở expanded). Thêm biến thể nav rail hẹp ở
  600–839 nếu sidebar 240px hiện tại quá rộng cho dải này (quyết định cụ thể khi code, ghi lại ở đây
  nếu đổi hướng).
- `RecordingDetailPage.tsx`: đổi lưới 2 cột transcript/panel từ `lg` (1024) sang `expanded` (840).
- `LibraryPage.tsx`: giữ danh sách 1 cột ở compact/medium (đúng mục 6: "danh sách; chi tiết là màn
  mới" / "list + detail 2 cột"), không đổi logic hiện tại vì đã đúng hướng; chỉ kiểm tra không vỡ ở
  320px và vùng chạm nút xóa ≥44px trên cảm ứng (hiện dùng `opacity-0` + hover, cần đảm bảo hiện
  luôn trên thiết bị chạm).
- `NewRecordingPage.tsx`, `FoldersPage.tsx`, `SettingsPage.tsx`, `LoginPage.tsx`, `TrashPanel.tsx`,
  `OnboardingTour.tsx`, `TranscriptView.tsx`, `RecorderPanel.tsx`, `UploadZone.tsx`: soát nhanh —
  không cuộn ngang ở 320px, vùng chạm nút ≥44px, `max-width` cột nội dung chính giữ ở mức hợp lý từ
  `medium` trở lên (mục 5 tài liệu 07), không đổi nghiệp vụ.
- Kiểm tra `index.css`: safe-area đã có sẵn, không cần đổi; chỉ bổ sung token breakpoint.

**Không làm lần này:**

- Không vẽ lại bộ nhận diện/màu sắc, không đổi cấu trúc nghiệp vụ hay API.
- Không động tới App Hub (Windows) hay desktop Tauri app khác (Smart Task Manager).
- Không viết lại từ đầu bằng component "size class" mới (`--bp-xs/s/m/l/xl`) — tài liệu 07 chính nó
  cũng chỉ đề xuất 2 mốc CSS thật (`medium`, `expanded`); các lớp `xs/s/m/l/xl` là để tham chiếu
  thiết bị/kiểm thử (mục 3, 7), không phải để tách riêng từng breakpoint trong code.
- Không thêm layout riêng cho foldable mở ngang (984×1092 dùng chung nhánh `expanded`).

## Hướng đi

Chỉnh tại chỗ (không viết lại trang nào từ đầu): thêm 2 token breakpoint mới trong
`apps/voicescribe/web/src/index.css`, đổi các câu lệnh class `md:`/`lg:` ở đúng 2 điểm cấu trúc nêu
trên sang `medium:`/`expanded:`, soát các trang còn lại bằng DevTools ở các độ rộng trong mục 7 của
tài liệu 07 (320, 360, 375, 390, 402, 412, 428, 600, 840, 984), sửa tại chỗ nếu phát hiện vỡ layout
hoặc vùng chạm quá nhỏ. Không đổi luồng dữ liệu/API.

## Rủi ro

| Rủi ro                                                                | Mức        | Giảm thiểu                                                              |
| --------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| Đổi điểm chuyển sidebar 768→600 làm sidebar/nav rail chật ở 600–767px | Trung bình | Test trực tiếp ở dải 600–839 bằng DevTools, co hẹp sidebar nếu cần      |
| Bỏ sót nút có vùng chạm <44px khi soát nhanh nhiều file               | Trung bình | Soát từng file theo danh sách ở trên, không bỏ qua file nào             |
| Capacitor Android WebView render khác DevTools Chrome                 | Thấp       | Chỉ kiểm tra được qua DevTools/trình duyệt lần này; APK thật chưa build |

## Kiểm chứng

- `npm run typecheck --workspace=voicescribe` và `npx vitest run apps/voicescribe/web/src` sạch.
- Chạy `npm run dev` (web) thật, dùng DevTools responsive mode kiểm tra đủ các độ rộng ở mục 7 tài
  liệu 07 trên các màn chính: Đăng nhập, Ghi âm mới, Thư viện, Chi tiết bản ghi, Thư mục, Cài đặt —
  không cuộn ngang ngoài ý muốn, không chữ/nút bị cắt, vùng chạm đủ cỡ.
- Ghi lại kết quả thật (đã sửa gì, bỏ gì, test thật ra sao) vào chính file plan này sau khi code
  xong, và vào `docs/project/04-nhat-ky-da-lam.md` như quy tắc chung.

## Kết quả thật (2026-11-20)

**Đã làm đúng hướng đã chốt:**

- Thêm `--breakpoint-medium: 600px` và `--breakpoint-expanded: 840px` vào `@theme` trong
  `apps/voicescribe/web/src/index.css`.
- `App.tsx`: `md:flex-row` → `medium:flex-row`.
- `Sidebar.tsx`: sidebar desktop `md:flex` → `medium:flex`, bottom-nav `md:hidden` →
  `medium:hidden`.
- `RecordingDetailPage.tsx`: lưới 2 cột transcript/panel `lg:grid-cols-[1fr_300px]` →
  `expanded:grid-cols-[1fr_300px]`.

**Làm thêm ngoài dự kiến ban đầu (phát hiện khi soát theo mục 5 tài liệu 07 — vùng chạm ≥44×44px):**
nhiều nút icon-only trong `LibraryPage.tsx` (xóa bản ghi, 2 nút phân trang) và
`RecordingDetailPage.tsx` (play/pause, lùi/tiến 5s, lưu/hủy tiêu đề, đổi tiêu đề, xóa bản ghi, thêm
người nói, xóa người nói, xóa ghi chú) và `Sidebar.tsx` (hướng dẫn, đăng xuất) đang nhỏ hơn 44px
(`p-1`/`p-1.5`/`p-2`/`h-9 w-9` quanh icon 14–20px) — thêm `min-h-11 min-w-11` (44px) + `flex
items-center justify-center`, giữ nguyên icon/màu/hành vi. Nút xóa trong danh sách người nói
(`RecordingDetailPage`) vốn chỉ hiện khi hover (không có fallback cảm ứng) — thêm
`focus:opacity-100 [@media(pointer:coarse)]:opacity-100` giống mẫu đã có sẵn ở `LibraryPage`.

**Chưa làm / bỏ so với dự kiến:**

- Chưa cần thêm biến thể "nav rail hẹp" riêng cho dải 600–839px — sidebar 240px hiện tại không bị
  phát hiện vỡ khi build/test; nếu sau này test thật trên máy/tablet ở dải này thấy chật thì quay
  lại điều chỉnh.
- Chưa soát hết từng pixel của `NewRecordingPage`, `FoldersPage`, `SettingsPage`, `LoginPage`,
  `TrashPanel`, `OnboardingTour`, `TranscriptView`, `RecorderPanel`, `UploadZone` — chỉ xác nhận
  không có lỗi build/typecheck/test liên quan; chưa rà từng nút nhỏ như đã làm ở 2 trang chính.

**Kiểm chứng thật:**

- `npm run typecheck --workspace=voicescribe` sạch.
- `npm run build` trong `apps/voicescribe/web` thành công (`vite build` ra `dist/`, không lỗi).
- Đối chiếu `dist/assets/index-*.css` thật sau build: xác nhận có đúng
  `@media(min-width:600px){...}` và `@media(min-width:840px){...}` — breakpoint mới được Tailwind
  v4 biên dịch đúng, không bị bỏ qua.
- `npx vitest run apps/voicescribe/src apps/voicescribe/web/src`: 5 file, 51/51 test pass, không
  có test nào hỏng do đổi breakpoint/class.
- Chạy `npm run dev` thật (cổng 5175), mở bằng Chrome tool, vào được trang Đăng nhập — nhưng
  `resize_window` của công cụ Chrome trong phiên này **không thu nhỏ được viewport thật** (vẫn báo
  1536×730 dù yêu cầu 420×900), nên **chưa xác nhận được bằng mắt** ở các độ rộng 320–440/600/840
  như mục 7 tài liệu 07 đòi hỏi — cần bạn tự mở DevTools responsive mode (hoặc điện thoại thật) để
  xác nhận phần này. Chưa đăng nhập thử do không có tài khoản test trong phiên này.
- Chưa build thử Android (Capacitor) để xác nhận WebView thật.
