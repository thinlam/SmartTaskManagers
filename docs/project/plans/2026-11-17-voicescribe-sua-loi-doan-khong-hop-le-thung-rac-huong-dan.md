# Kế hoạch: VoiceScribe — sửa gốc lỗi "Danh sách đoạn hội thoại không hợp lệ", Thùng rác, Hướng dẫn lần đầu

> Cập nhật: 2026-11-17 (đã code + test xong cả 3 việc, xem "Kết quả thật" ở cuối).

## Mục tiêu / nghiệp vụ

Người dùng báo lỗi "Danh sách đoạn hội thoại không hợp lệ" khi thêm người nói mới qua popup
"Đoạn này do ai nói". Yêu cầu: tìm đúng nguyên nhân gốc (không nới lỏng/tắt validator, không nuốt lỗi),
đồng thời làm thêm 2 việc liên quan: Thùng rác cho đoạn đã xóa (khôi phục được), và màn hướng dẫn lần
đầu cho người dùng mới.

Hiểu theo nghiệp vụ: "thêm người nói" nghĩa là tạo một người nói mới trong danh sách của bản ghi —
**không** tự gán cho đoạn đang xem trừ khi người dùng chọn rõ; người nói cũ không đổi; popup phải thấy
đủ mọi người đã thêm. Đây khớp với thiết kế `speaker_roster` đã có từ trước (độc lập với `segments`).

## Phạm vi

**Làm:**

- Tìm và sửa nguyên nhân gốc thật của lỗi (khác với bản sửa `7c0d4a1` ngày 2026-11-09, vốn chỉ chặn 1
  đường khác gây đoạn rỗng).
- Validate tên người nói cụ thể ở UI (trống/quá dài/trùng tên), không dùng thông báo chung.
- Soát lại mọi thao tác khác đụng `segments` (xóa, gộp, tách, chuyển câu) xem có cùng rủi ro không.
- Viết test tái hiện đúng lỗi + test hồi quy cho các thao tác trên.
- Thùng rác: xóa mềm, khôi phục đúng vị trí thời gian, xóa vĩnh viễn có xác nhận, chọn nhiều, nhắc dọn
  sau 30 ngày (không tự xóa).
- Hướng dẫn lần đầu: tối màn hình + khung sáng quanh từng thành phần thật, điều hướng được, bỏ qua/nhớ
  đã xem, mở lại được.

**Không làm trong lần này:**

- Chuyển model người nói từ string key sang entity `{id, name, color}` (giữ nguyên kiến trúc
  `speaker_roster`/`speaker_names` đã có — đổi hẳn mô hình không cần thiết để sửa bug này).
- Tự động xóa thùng rác sau 30 ngày (chỉ nhắc, không tự xóa — tôn trọng nguyên tắc không tự ý xóa dữ
  liệu của người dùng).
- Chạy migration `007`/`008` lên Railway thật (việc của chủ dự án).
- Test UI tương tác thật qua trình duyệt (máy này không có backend+Postgres chạy).

## Hướng đi / cách làm

**Nguyên nhân gốc:** `mergeTranscriptWithSpeakers()` (`src/utils/mergeSpeakers.ts`) dựng `segments` trực
tiếp từ transcript của Whisper, không lọc đoạn rỗng/toàn khoảng trắng (Whisper có thể trả đoạn như vậy
cho khoảng im lặng/nhiễu). Đoạn rỗng này nằm sẵn trong `recordings.segments` ngay từ lúc tạo, không qua
validator nào. `PATCH /api/recordings/:id` khi nhận `segments` validate **lại toàn bộ mảng** — lần đầu có
PATCH đụng `segments` sau đó (thường là gán người nói mới) thì thất bại vì đoạn rỗng đã có từ trước, dù
thao tác người dùng vừa làm hoàn toàn hợp lệ.

**Sửa:**

- `mergeSpeakers.ts`: bỏ đoạn rỗng/toàn khoảng trắng (và words của nó) trước khi đưa vào kết quả — sửa
  tại nguồn, không đổi `parseOneSegment`/`parseSegments` ở `recordingsRoutes.ts` (chỉ export thêm để test
  được, logic giữ nguyên).
- Migration `007_strip_blank_segments`: dọn các bản ghi cũ đã bị lưu đoạn rỗng từ trước khi có bản sửa
  này.
- `lib/transcript.ts` thêm `validateSpeakerName()`, dùng ở `SpeakerMenu` (popup) và card "Người nói"
  (trang chi tiết) — thay thông báo chung bằng lỗi cụ thể dưới ô nhập.

**Thùng rác:** cột mới `recordings.trash` (jsonb, migration `008_recording_trash`) — tách khỏi
`segments` để không phải sửa lại mọi nơi đang đọc `segments` (buildBlocks, thống kê người nói,
validator…). `lib/trash.ts` (hàm thuần, test được): `toTrashItem`, `insertByTime` (khôi phục theo mốc
thời gian — không cố nhớ lại đúng vị trí cũ trong mảng vì có thể đã đổi do các sửa khác ở giữa),
`restoreTrashItem` (gán "Chưa xác định" nếu người nói gốc đã bị xóa), `isPastAutoPurgeAge`.
`TrashPanel.tsx` (UI mới) dùng lại `ConfirmDialog`/`secondaryButtonClass` có sẵn ở `components/ui.tsx`.

**Hướng dẫn lần đầu:** `OnboardingTour.tsx` sống ở `App.tsx`'s `Shell` (ngang hàng các trang) vì các bước
cần cả trang "Ghi âm mới" (không cần bản ghi) và trang chi tiết (cần 1 bản ghi đã xong) — tour tự điều
hướng (`onNavigate`) giữa 2 trang, tự lấy 1 bản ghi mẫu qua `api.recordings.list()` nếu cần. Đánh dấu mục
tiêu từng bước bằng `data-tour="..."` gắn trực tiếp lên phần tử thật đã có trong UI (không dựng UI giả).
Nếu một bước không tìm được phần tử/trang cần (ví dụ người dùng mới chưa có bản ghi nào) → tự bỏ qua bước
đó, không bao giờ chỉ mũi tên vào chỗ trống. Lưu "đã xem" qua `localStorage`; mở lại qua nút "?" mới ở
`Sidebar`.

## Rủi ro

| Rủi ro                                                                                     | Mức        | Giảm thiểu                                                                                                                                |
| ------------------------------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Migration `007` chạy sai trên dữ liệu Railway thật (chưa thử trên DB thật)                 | Trung bình | SQL chỉ `UPDATE` dựa trên `jsonb_array_elements`/`btrim`, đã test logic tương đương ở test đơn vị; chủ dự án nên xem lại trước khi deploy |
| Hướng dẫn lần đầu gọi `api.recordings.list()` thêm 1 lần khi mở app lần đầu (tải nhẹ thêm) | Thấp       | Chỉ gọi khi thật sự cần (bước cần trang chi tiết), có bắt lỗi, không chặn UI nếu lỗi                                                      |
| Thùng rác thêm cột `trash` làm payload PATCH lớn hơn khi có nhiều đoạn bị xóa lâu ngày     | Thấp       | Không giới hạn trong lần này; `MAX_TRASH = 2000` đã chặn ở backend để tránh payload vô hạn                                                |
| Chưa chạy thử qua trình duyệt thật (không có backend+Postgres local ở máy này)             | Trung bình | Đã chạy đủ test đơn vị cho toàn bộ logic thuần; cần chủ dự án tự xác nhận UI trước khi phát hành                                          |

## Kiểm chứng

Dự kiến: `npm run typecheck` cho cả backend (`apps/voicescribe`) và frontend
(`apps/voicescribe/web`), `npm run build` frontend, viết và chạy `vitest` cho các hàm thuần đã sửa/thêm.

---

## Kết quả thật (2026-11-17)

- **Đã làm đúng như kế hoạch:** sửa gốc ở `mergeSpeakers.ts`, migration `007`/`008`, `validateSpeakerName`
  nối vào `SpeakerMenu` và card "Người nói", `lib/trash.ts` + `TrashPanel.tsx`, `OnboardingTour.tsx` +
  `lib/onboarding.ts` + nút "?" ở `Sidebar`, gắn `data-tour` vào 8 phần tử thật trên `NewRecordingPage`
  và `RecordingDetailPage`.
- **Khác dự kiến:** tách "lọc tạp âm và xuất file" (Việc 3, gợi ý gốc là 1 bước) thành 2 bước riêng vì 2
  phần tử đó nằm ở 2 trang khác nhau (lọc tạp âm ở trang "Ghi âm mới", xuất file ở trang chi tiết) — tổng
  8 bước thay vì 7. `Card` (`components/ui.tsx`) được sửa để nhận thêm `data-tour`/các thuộc tính DOM
  khác (tổng quát hóa nhỏ, không phải thay đổi ngoài phạm vi vì cần cho việc gắn mốc tour vào các `Card`
  có sẵn). Export thêm `parseNotes`/`parseSegments`/`parseSpeakerNames`/`parseSpeakerRoster`/`parseTrash`
  từ `recordingsRoutes.ts` (vốn chỉ dùng nội bộ) để viết được test — không đổi logic bên trong.
- **Kiểm chứng thật:**
  - `npm run typecheck` ở `apps/voicescribe` (backend): sạch.
  - `npm run typecheck` và `npm run build` ở `apps/voicescribe/web`: sạch (build ra `dist/` thật, có 1
    cảnh báo chunk > 500kB từ Vite — không mới, không liên quan tới lần sửa này).
  - `npx vitest run` (toàn repo, lọc theo 2 workspace trên): **51/51 test qua** — 5 file mới:
    `src/utils/mergeSpeakers.test.ts` (5), `src/api/recordingsValidation.test.ts` (18),
    `web/src/lib/transcript.test.ts` (12), `web/src/lib/trash.test.ts` (12), `web/src/lib/onboarding.test.ts` (4).
- **Chưa kiểm chứng:** chưa chạy thật qua trình duyệt với backend+Postgres thật (máy này không có); chưa
  chạy migration `007`/`008` trên dữ liệu Railway thật; chưa cài/build lại bản desktop VoiceScribe với các
  thay đổi này. **Chưa commit** (chờ người dùng xác nhận trước khi commit theo đúng quy tắc chỉ commit khi
  được yêu cầu).
