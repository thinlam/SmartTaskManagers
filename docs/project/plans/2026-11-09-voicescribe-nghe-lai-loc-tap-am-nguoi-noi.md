# Kế hoạch: VoiceScribe — nghe lại audio theo đoạn, lọc tạp âm, sửa lỗi danh sách người nói

> Ngày: 2026-11-09. Theo quy tắc 3 bước ở `CLAUDE.md`. Khảo sát codebase trước khi viết plan này
> (xem `apps/voicescribe/{src,web,diarization-service}`).

## Mục tiêu / nghiệp vụ

Người dùng VoiceScribe (ghi âm → chuyển văn bản theo đoạn, gán người nói) cần: (1) nghe lại đúng audio gốc
theo từng đoạn để đối chiếu/sửa chữ; (2) giảm tạp âm trước khi nhận dạng để văn bản chính xác hơn; (3) sửa
lỗi nghiêm trọng — danh sách người nói trong popup "Đoạn này do ai nói" bị mất người khi người đó không còn
đoạn nào (vì danh sách hiện tại được suy ra "on the fly" từ segment hiện có, không phải dữ liệu lưu riêng).

## Phạm vi

**Làm trong lần này** (theo đúng thứ tự Việc 1 → 2 → 3, build+test sau mỗi việc):

1. **Nghe lại audio theo đoạn:**
   - Giữ lại file audio gốc sau khi xử lý xong (hiện `jobs.ts` luôn `rm()` file tạm trong `finally` — đây là
     thay đổi nghiệp vụ lớn nhất của việc này: audio gốc giờ phải tồn tại lâu dài).
   - Thêm cột `audio_path` (migration `003_...`) trên bảng `recordings`, route stream có hỗ trợ header
     `Range` để tua.
   - `segments` đã có `start`/`end` (giây) sẵn — không cần đổi model giờ, chỉ cần dùng để seek.
   - Frontend: `<audio>` + điều khiển play/pause/tốc độ/tua, bấm vào block thì play đúng
     `start`–`end`, tự dừng cuối đoạn, highlight + cuộn theo, phím tắt Space/←/→.
   - Audio file bị thiếu (bản ghi cũ trước khi có cột `audio_path`, hoặc file bị xoá) → ẩn nút nghe, không
     crash.
2. **Lọc tạp âm:** chèn filter `ffmpeg` (`highpass=f=80,afftdn`) vào đúng bước resample sẵn có trong
   `audioChunker.ts` (không thêm binding RNNoise mới — xem Hướng đi), 3 mức nhẹ/vừa/mạnh (mặc định vừa), có
   cờ bật/tắt; giữ file gốc, lưu file đã lọc riêng; người dùng chọn nghe bản gốc hay đã lọc.
3. **Sửa bug danh sách người nói:** thêm roster độc lập (không suy ra từ `segments` mỗi lần nữa) — migration
   thêm cột `speaker_roster` (jsonb) trên `recordings`, cộng dồn (không tự rút gọn khi hết đoạn), chỉ đổi khi
   người dùng chủ động thêm/đổi tên/xoá/gộp.

**KHÔNG làm trong lần này:**

- Không đổi mô hình `Speaker{id,name,color}` quan hệ riêng như brief gốc đề xuất — xem lý do ở Hướng đi.
- Không làm WER benchmark tự động hoá CI — chỉ so sánh tay trên vài mẫu, ghi kết quả vào kế hoạch.
- Không đổi diarization sidecar Python để lọc nhiễu riêng cho pyannote (chỉ lọc ở bước chuyển văn bản).

## Hướng đi / cách làm

- **Lưu audio gốc lâu dài:** đổi `jobs.ts` bỏ `rm(job.audioPath)` khi complete (vẫn xoá khi job fail/cancel
  để không rò tệp rác); di chuyển file từ `UPLOAD_DIR` tạm sang thư mục lưu trữ bền
  (`AUDIO_STORAGE_DIR`, cấu hình qua env như các biến khác trong `env.ts`); cột `audio_path` lưu đường dẫn
  tương đối. DELETE recording phải xoá luôn file audio (hiện route DELETE không xoá file vì chưa có gì để
  xoá).
- **Route stream:** file mới `src/api/audioRoutes.ts`, đọc theo `Range`, trả `206 Partial Content`, auth
  bằng JWT hiện có (query token hoặc header, vì `<audio>` không tự gửi header tuỳ ý — cần quyết định cách
  truyền token, ví dụ query param ký ngắn hạn).
- **Lọc tạp âm bằng ffmpeg filter, không thêm RNNoise/WebRTC binding mới:** đúng convention hiện tại (toàn
  bộ xử lý audio qua `execFile ffmpeg`, không npm DSP binding nào). `afftdn` (FFT denoise) + `highpass=f=80`
  là filter built-in ffmpeg, đủ chuẩn cho giọng nói, không thêm dependency hệ thống mới (ffmpeg đã là
  yêu cầu bắt buộc sẵn). RNNoise cho chất lượng cao hơn nhưng cần build native binding — để dành nếu sau
  này chất lượng ffmpeg filter không đủ.
- **Roster người nói:** thêm cột `speaker_roster: {key, name}[]` (giữ string key như hiện tại, KHÔNG đổi
  sang `Speaker{id,name,color}` quan hệ riêng như brief gốc — vì cả hệ thống đang dùng `speaker: string` key
  xuyên suốt `segments`/`speakerNames`/export txt-docx-srt, đổi sang id quan hệ là việc lớn hơn nhiều so với
  lỗi cần sửa, rủi ro phá tính năng export/diarization đang chạy). `speakerOrderOf()` trong `transcript.ts`
  đổi thành đọc từ `recording.speakerRoster` (cộng dồn key mới khi diarization sinh ra, không rút gọn khi
  segment đổi), `SpeakerMenu` dùng roster này thay vì derive từ `segments`. Đổi tên áp dụng vào
  `speakerNames` như hiện tại (đã đúng, không đổi). Xoá người nói còn đoạn dùng → cảnh báo, cho chọn chuyển
  đoạn sang người khác hoặc bỏ gán (set `speaker: ''`/null nếu hệ thống cho phép — cần kiểm tra lại khi code).
- Migration mới: `003_add_audio_path_and_speaker_roster.sql`-kiểu (nối vào mảng `MIGRATIONS` trong
  `migrate.ts`, không sửa migration cũ) — bản ghi cũ: `audio_path = NULL` (ẩn nút nghe),
  `speaker_roster` backfill = `speakerOrderOf(segments)` hiện tại của từng bản ghi (chỉ đúng tại thời điểm
  migrate, không hồi phục được speaker đã mất trước đó — nêu rõ với người dùng, không thể tự sửa dữ liệu đã
  mất).

## Rủi ro

| Rủi ro                                                                                   | Mức        | Giảm thiểu                                                                                         |
| ---------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| Giữ audio gốc lâu dài tốn dung lượng đĩa server, trước đây xoá ngay để tiết kiệm         | Trung bình | Không tự ý giới hạn — nêu rõ với người dùng để quyết định dọn dẹp định kỳ/giới hạn dung lượng sau. |
| Token xác thực cho `<audio src>` (không tự gửi header) lộ qua URL nếu dùng query param   | Trung bình | Token ngắn hạn riêng cho audio (khác JWT chính), scope hẹp theo recording id.                      |
| Filter ffmpeg lọc quá mạnh làm mất chữ khi nhận dạng                                     | Trung bình | 3 mức, mặc định vừa, test WER tay trước/sau trên vài mẫu có tiếng ồn trước khi coi mặc định ổn.    |
| Migration backfill `speaker_roster` không phục hồi được speaker đã mất trước khi sửa bug | Thấp       | Nêu rõ giới hạn này với người dùng, không có cách suy luận ngược an toàn từ dữ liệu đã mất.        |
| Đổi `jobs.ts` (bỏ xoá file khi complete) có thể phá luồng dọn dẹp đang chạy đúng         | Trung bình | Chỉ bỏ xoá ở nhánh complete, giữ xoá ở nhánh fail/cancel; test lại toàn bộ luồng transcribe.       |

## Kiểm chứng

- Backend: `npm run build`/typecheck trong `apps/voicescribe`, test cho migration mới, route stream (status
  206/Range), roster không rút gọn khi segment đổi.
- Frontend: typecheck/build/eslint `apps/voicescribe/web`, test cho `speakerOrderOf`/roster mới,
  `buildBlocks` không đổi hành vi cũ.
- Tay: ghi âm thật → nghe lại từng đoạn đúng mốc, tua/tốc độ hoạt động; tải file ồn → so sánh WER trước/sau
  lọc trên vài mẫu, ghi kết quả thật vào phần "Kết quả thật" của plan này; gán/gỡ người nói qua lại nhiều
  lần → không mất ai khỏi popup; đóng mở lại app → roster + audio vẫn còn.
- Không chạy migration trên dữ liệu Railway/Postgres thật từ phía tôi — theo đúng quy tắc dự án.

## Kết quả thật

### Việc 1 — Nghe lại audio theo đoạn (xong 2026-11-09)

- **Backend:** migration `003_recording_audio_path` thêm cột `recordings.audio_path` (nullable — bản ghi
  cũ/không giữ được audio có giá trị `NULL`, ẩn nút nghe ở frontend qua `hasAudio`). `jobs.ts`: khi job hoàn
  tất, thay vì xóa file tạm (`UPLOAD_DIR`) như trước, di chuyển (`rename`, fallback `copyFile+rm` nếu khác
  filesystem — lỗi `EXDEV`) sang `AppConfig.audioStorageDir` (biến môi trường `AUDIO_STORAGE_DIR`, mặc định
  `voicescribe-audio`), đặt tên theo `recordingId` + đuôi file gốc. Lỗi khi di chuyển (best-effort) không
  làm mất transcript — chỉ log và lưu `audio_path = NULL`. Khi job fail/cancel, file tạm vẫn bị xóa như cũ
  (không đổi). Route mới `src/api/audioRoutes.ts` (`GET /api/recordings/:id/audio`) stream file có hỗ trợ
  `Range`/`206 Partial Content` để tua — mount **trước** router `/recordings` có `requireAuth` thông thường,
  vì `<audio src>` không gửi được header `Authorization`; route này tự xác thực JWT qua `?token=` (dùng lại
  `verifyToken` sẵn có, không thêm loại token riêng như dự kiến ban đầu trong Hướng đi — đơn giản hơn, cùng
  thời hạn JWT 30 ngày đã dùng cho toàn app, không tăng rủi ro so với hiện trạng vì mọi API khác đã tin
  tưởng JWT y vậy). `recordingsRoutes.ts`'s DELETE giờ xóa luôn file audio (`RETURNING audio_path` rồi `rm`).
- **Frontend:** `audioUrl(recordingId, hasAudio)` trong `lib/api.ts` build URL kèm token. Hook
  `lib/audioPlayer.ts` (`useAudioPlayer`) bọc một `<audio>` thường — play/pause, tua, tốc độ
  0.75/1/1.25/1.5x, `playRange(start,end,loop)` tự dừng (hoặc lặp) đúng khoảng của đoạn. `RecordingDetailPage`
  thêm `AudioPlayerBar` (play/pause, ±5s, thanh tua, tốc độ, toggle "Lặp đoạn") hiện khi `rec.hasAudio`; ẩn
  hẳn + hiện dòng giải thích khi không có audio (bản ghi cũ) — không crash. Phím tắt Space/←/→ chỉ kích hoạt
  khi không đang gõ vào input/textarea nào (tránh chặn gõ tiêu đề/ghi chú/tìm kiếm/sửa đoạn).
  `TranscriptView.tsx`'s `SpeakerTranscript` nhận thêm `canPlayAudio`/`currentTime`/`isPlayingAudio`/
  `onPlayBlock` — nút "Nghe đoạn này" cạnh mốc giờ mỗi block, tự tính block đang phát từ `currentTime` (dùng
  chung logic cho cả phát toàn bộ và phát riêng từng đoạn, không cần state trùng lặp), highlight + tự cuộn
  (`scrollIntoView`) đúng đoạn đang nghe.
- **Khác dự kiến:** không thêm token ngắn hạn riêng cho audio như nêu ở Hướng đi/Rủi ro — dùng lại JWT chính
  qua query param, lý do ở trên. Sửa chữ trong đoạn (`replaceBlockText`) không đổi — đã tự đúng từ trước
  (mốc `start`/`end` của block giữ nguyên khi gộp lại thành 1 segment), không cần sửa gì thêm cho yêu cầu
  "không làm lệch mốc khi sửa chữ".
- Kiểm chứng thật: backend+frontend `tsc`/`vite build` sạch, `npx eslint` sạch (các lỗi "Definition for rule
  ... was not found" là do cấu hình ESLint thiếu plugin `react-hooks`/`jsx-a11y` **từ trước**, đã xác minh
  lỗi này tồn tại sẵn trên `HEAD` ở `TranscriptView.tsx` dòng 360 trước khi tôi sửa gì — không phải lỗi mới).
  **App này không có test suite nào** (`npm test` báo "Missing script"), nên không có bước test tự động để
  chạy — chỉ dừng ở typecheck/build/lint. **Chưa chạy thật qua trình duyệt** (chưa khởi động backend+Postgres
  local trên máy này để thử ghi âm/tải file/nghe lại thật). Chưa chạy migration `003` trên dữ liệu thật.
