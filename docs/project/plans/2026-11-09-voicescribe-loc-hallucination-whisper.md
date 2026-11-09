# Lọc câu "hallucination" của Whisper ở cuối bản ghi dài

> Trạng thái: xong · Tạo: 2026-11-09

## Mục tiêu / nghiệp vụ

Người dùng báo: với bản ghi âm dài, đoạn cuối bản chép lời tự nhiên xuất hiện câu "Cảm ơn các bạn đã theo
dõi." dù người nói không hề nói câu đó. Đây là hiện tượng hallucination đã biết của Whisper: khi một đoạn
âm thanh ~30s gần như im lặng/nhiễu (ví dụ phần đuôi của chunk cuối cùng khi chia nhỏ audio dài), model
không trả về rỗng mà "bịa" ra một câu quen thuộc học được từ dữ liệu huấn luyện (phụ đề video YouTube) —
thường là lời cảm ơn, mời subscribe, thông báo phụ đề...

Hiểu theo nghiệp vụ: bản chép lời phải phản ánh đúng những gì người dùng **thực sự nói**, nên các câu bịa
này cần được loại bỏ khỏi kết quả thay vì hiển thị cho người dùng.

## Phạm vi

**Làm:**

- Thêm danh sách các câu hallucination thường gặp của Whisper (tiếng Việt + tiếng Anh).
- Trong `transcription.ts` (`transcribeAudio`), sau khi dựng xong `segments` từ kết quả Whisper, lọc bỏ
  bất kỳ segment nào có text khớp gần như nguyên văn (sau khi chuẩn hóa: lowercase, bỏ khoảng trắng thừa,
  bỏ dấu câu cuối) với một câu trong danh sách.
- Nếu sau khi lọc, toàn bộ `segments`/`text` của một chunk trở thành rỗng → coi như chunk không có lời
  nói (giống hành vi `allowEmpty` hiện có), không phải lỗi.

**Không làm lần này:**

- Không dùng VAD (voice activity detection) để phát hiện im lặng trước khi gửi cho Whisper — tốn hạ tầng
  hơn mức cần thiết cho vấn đề này.
- Không thêm UI đánh dấu "nghi ngờ hallucination" — theo lựa chọn của người dùng, xóa hẳn khỏi kết quả.
- Không áp dụng lọc riêng cho vị trí (đầu/giữa/cuối audio) — áp dụng chung cho mọi segment vì hallucination
  có thể xảy ra ở bất kỳ chunk nào bị im lặng, không riêng gì chunk cuối.

## Hướng đi / cách làm

- File đổi: `apps/voicescribe/src/services/transcription.ts`.
- Thêm hằng số `KNOWN_HALLUCINATIONS: string[]` — danh sách câu đã chuẩn hóa sẵn (lowercase, không dấu câu
  cuối), ví dụ: "cảm ơn các bạn đã theo dõi", "cảm ơn đã xem video", "hãy đăng ký kênh", "nhớ like và
  subscribe", "thanks for watching", "please subscribe", "don't forget to subscribe", "phụ đề được thực
  hiện bởi...". Danh sách này có thể cần bổ sung dần khi gặp thêm case mới — ghi trong comment để dễ thêm.
- Thêm hàm `normalizeForHallucinationCheck(text: string): string` — lowercase, trim, bỏ dấu câu ở cuối câu
  (`.`, `!`, `?`, `…`), gộp khoảng trắng thừa.
- Thêm hàm `isHallucinatedPhrase(text: string): boolean` — so khớp **nguyên văn tuyệt đối** sau chuẩn hóa
  với từng phần tử trong `KNOWN_HALLUCINATIONS` (không dùng includes/substring, tránh lọc nhầm câu dài có
  chứa cụm từ đó một cách hợp lệ).
- Áp dụng filter ngay sau khi có `segments` (cả 2 nhánh `wordLevel` và nhánh thường), trước khi return —
  dùng `segments.filter((s) => !isHallucinatedPhrase(s.text))`.
- Sau khi lọc, nếu `segments` rỗng nhưng lúc đầu `output.text` không rỗng (nghĩa là toàn bộ nội dung chunk
  này là hallucination) → trả `{ text: '', segments: [], processingTimeMs }` giống nhánh `allowEmpty`
  hiện có (không throw lỗi, vì `transcribeLongAudio` đã coi 1 chunk rỗng là bình thường).
- Không đổi schema, không đổi backend khác, không đổi frontend.

## Rủi ro

| Rủi ro                                                                                       | Mức        | Giảm thiểu                                                                                                               |
| -------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Người nói thật sự nói đúng 1 trong các câu đó (hiếm, ví dụ MC cảm ơn khán giả)               | Thấp       | Chỉ xảy ra khi khớp nguyên văn tuyệt đối cả câu, không phải khớp 1 phần — rủi ro nhỏ, chấp nhận theo lựa chọn người dùng |
| Danh sách chưa đủ, bỏ sót câu hallucination khác                                             | Trung bình | Ghi rõ trong comment là danh sách "biết tới hiện tại", có thể bổ sung dần khi gặp case mới                               |
| Lọc nhầm làm thiếu nội dung thật nếu chuẩn hóa quá lỏng (so khớp gần đúng thay vì tuyệt đối) | Thấp       | Dùng so khớp nguyên văn tuyệt đối sau chuẩn hóa, không dùng includes/fuzzy                                               |

## Kiểm chứng

- `npm run typecheck --workspace=voicescribe` sạch.
- Chạy `npm run build --workspace=@voicescribe/web` (không ảnh hưởng, nhưng đảm bảo không có lỗi lan sang).
- Chưa có test tự động cho transcription.ts (gọi API thật tốn phí) — kiểm tra bằng cách đọc lại logic lọc
  thủ công, không chạy thử với file âm thanh thật trong phiên này.

## Kết quả thật

- Đã làm đúng theo "Hướng đi" ở trên: thêm `KNOWN_HALLUCINATIONS`, `normalizeForHallucinationCheck`,
  `isHallucinatedPhrase` và áp dụng filter trong `transcribeAudio` (`apps/voicescribe/src/services/transcription.ts`)
  — lọc segment khớp nguyên văn tuyệt đối (sau chuẩn hóa) với danh sách; nếu cả chunk chỉ còn
  hallucination thì coi như chunk rỗng (`allowEmpty`) hoặc throw lỗi "không phát hiện lời nói" như hành vi
  cũ khi `allowEmpty` là false.
- Đã kiểm chứng thật: `npm run typecheck --workspace=voicescribe` sạch, `npm run build --workspace=@voicescribe/web`
  sạch. **Chưa kiểm chứng:** chưa chạy với file âm thanh thật qua API Hugging Face (tốn phí/thời gian),
  nên chưa xác nhận danh sách `KNOWN_HALLUCINATIONS` có khớp đúng với câu hallucination thật mà người dùng
  gặp hay không — cần người dùng thử lại với bản ghi dài tương tự sau khi deploy backend lên Railway (deploy
  là việc của chủ dự án).
