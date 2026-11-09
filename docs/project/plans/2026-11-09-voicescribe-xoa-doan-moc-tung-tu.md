# Kế hoạch: VoiceScribe — xóa/gộp đoạn, mốc thời gian đến từng từ

> Ngày: 2026-11-09. Theo quy tắc 3 bước ở `CLAUDE.md`. Khảo sát codebase trước khi viết plan này (đọc
> `apps/voicescribe/src/services/{transcription,longAudioTranscription,diarization,jobs,recordings}.ts`,
> `apps/voicescribe/src/utils/mergeSpeakers.ts`, `apps/voicescribe/src/api/recordingsRoutes.ts`,
> `apps/voicescribe/src/types/{transcription,diarization}.ts`, `apps/voicescribe/src/db/migrate.ts`,
> `apps/voicescribe/web/src/lib/{transcript,audioPlayer}.ts`,
> `apps/voicescribe/web/src/components/TranscriptView.tsx`, `apps/voicescribe/web/src/pages/RecordingDetailPage.tsx`).

## Mục tiêu / nghiệp vụ

Người dùng VoiceScribe sửa transcript bằng tay sau khi nhận dạng xong, cần:

- **Việc A:** xóa nhanh 1 đoạn sai/thừa (không hỏi xác nhận, có hoàn tác), gộp đoạn liền kề khi cần — không
  đụng tới file audio gốc.
- **Việc B:** khi cắt/dán chữ giữa các đoạn (ví dụ dời câu "dạ bây giờ ở bên Pháp" từ đầu đoạn Sếp sang
  cuối đoạn Chú vì gán nhầm người nói), nút "nghe đoạn này" phải phát đúng âm thanh của **chữ đang có trong
  đoạn đó lúc này**, không phát theo mốc `start`/`end` cũ đã lưu từ lúc nhận dạng — hiện tại mốc đoạn cố
  định nên nghe sai.

## Phạm vi

**Làm trong lần này** (Việc A trước, build/test xong mới sang Việc B):

1. Nút xóa từng đoạn (thùng rác, cạnh nút sửa) + toast "Đã xóa đoạn · Hoàn tác" 8 giây + Ctrl+Z.
2. Gộp đoạn với đoạn liền trước/sau.
3. Lưu mốc thời gian theo từng từ (`words: {id, text, startMs, endMs}[]` cho cả bản ghi), đoạn tham chiếu
   `wordIds: string[]` thay vì chỉ `start`/`end` cố định.
4. Thao tác "Chuyển lên đoạn trước" / "Chuyển xuống đoạn sau" / "Tách đoạn tại con trỏ" bảo toàn mốc từng từ.
5. Phát đúng theo từ hiện có trong đoạn (đầu từ đầu → cuối từ cuối), kể cả sau khi đoạn rỗng/dính nhiều
   khoảng thời gian không liền nhau (phát nối tiếp từng khoảng liền, báo nhẹ "âm thanh không liên tục").
6. Highlight theo từng từ đang phát, không chỉ cả đoạn.
7. Đệm 80–150ms đầu/cuối khi phát 1 đoạn/từ.
8. Migration dữ liệu cũ: đoạn cũ không có `wordIds` → vẫn phát theo `start`/`end` cũ (phương án dự phòng),
   không ép phải có từ.

**KHÔNG làm trong lần này:**

- Không dựng forced-alignment service riêng (xem lý do ở Hướng đi) — chấp nhận độ chính xác mốc từ ở mức
  "đủ dùng cho cắt/dán/nghe lại", không phải khoa học chính xác tuyệt đối từng mili-giây.
- Không đổi luồng diarization (gán người nói) — vẫn khớp theo `start`/`end` của đoạn như hiện tại.
- Không viết test tự động (app chưa có test runner nào, xem Việc 1-3 trước đó) — kiểm tra tay theo kịch
  bản ở mục Kiểm chứng.

## Hướng đi / cách làm

### Việc A — Xóa/gộp đoạn

- `web/src/lib/transcript.ts`: thêm `deleteBlock(segments, block)` (loại bỏ `segments[from..to]`),
  `mergeWithNeighbor(segments, block, direction: 'prev'|'next')` (gộp text + word list của 2 block liền kề
  cùng/khác người nói — theo yêu cầu "khi cùng người nói hoặc người dùng chọn gộp" nên cho gộp cả khác
  người nói nếu người dùng chủ động bấm, giữ speaker của đoạn đầu tiên theo thứ tự thời gian).
- `TranscriptView.tsx`'s `SpeakerTranscript`: thêm nút xóa (Trash2) + nút gộp lên/xuống cạnh nút sửa, hiện
  khi hover (`opacity-0 group-hover:opacity-100`, giống nút xóa người nói ở Việc 3) — trên cảm ứng không có
  hover nên **luôn hiện** khi ở chế độ Chỉnh sửa (không cần thêm logic phát hiện touch — đơn giản hơn, đáp
  ứng đúng yêu cầu "luôn hiện trên màn hình cảm ứng" mà không phải làm riêng cho rẽ nhánh).
- **Hoàn tác (Ctrl+Z):** không có store state management (Redux/Zustand) trong app — `RecordingDetailPage`
  giữ 1 state snapshot gần nhất `lastDeleted: {segments, atIndex} | null` khi xóa/gộp, tự hết hạn sau 8s
  (dọn bằng `setTimeout`), toast có nút "Hoàn tác" gọi `undoDelete()` chèn lại `segments` đã lưu đúng vị
  trí cũ rồi `save()`. Phím tắt Ctrl+Z gọi cùng hàm, chỉ khi `lastDeleted` còn hiệu lực và không đang gõ
  trong input/textarea khác (theo đúng pattern phím tắt Space/←/→ đã có ở Việc 1).
- Xóa/gộp chỉ đổi mảng `segments` qua `save({segments})` (PATCH có sẵn) — **không đụng** `audio_path`/
  `audio_filtered_path`, tự động đúng yêu cầu "không xóa file audio gốc" vì 2 thứ này độc lập hoàn toàn
  trong schema hiện tại.
- Player/highlight: `playingBlockFrom` trong `SpeakerTranscript` đã suy ra từ `blocks` dựng lại mỗi lần
  `segments` đổi (`useMemo`) — xóa/gộp xong, `blocks` tự tính lại, không cần sửa logic phát/highlight cho
  Việc A.

### Việc B — Mốc thời gian theo từ

**Lấy word-level timestamp từ đâu (quyết định + lý do):**

- Backend đang gọi Whisper qua `@huggingface/inference`'s `automaticSpeechRecognition()`, tham số
  `parameters: { return_timestamps: true }` — theo đúng type khai báo trong `@huggingface/tasks`, giá trị
  này chỉ nhận `boolean`, trả về `chunks` ở mức **câu/cụm** (không phải từ). Tuy interface có
  `[property: string]: unknown` (cho phép gửi field ngoài schema khai báo), và pipeline ASR gốc của
  HF Transformers (chạy bên dưới model `openai/whisper-large-v3`) hỗ trợ `return_timestamps="word"` để trả
  `chunks` ở mức từng từ — **nhưng đây là hành vi của pipeline, không phải hợp đồng API chính thức được
  gõ kiểu**, và request đi qua "Inference Providers" (có thể route tới nhiều nhà cung cấp khác nhau tuỳ
  cấu hình — `hf-inference`, `fal-ai`, `replicate`, `deepinfra`, `together`, thấy trong
  `node_modules/@huggingface/inference/dist/*/providers/`), không chắc mọi provider đều tôn trọng tham số
  này giống hệt pipeline HF Transformers gốc.
- **Chọn:** thử gửi `return_timestamps: 'word'` (ép kiểu `as unknown as boolean` vì TS không cho phép
  string, kèm comment giải thích rõ đây là tham số ngoài schema khai báo chính thức), rồi **tự phát hiện
  kết quả có thực sự ở mức từ hay không** (heuristic: mỗi `chunk.text` sau khi trim không còn khoảng trắng
  bên trong → coi là 1 từ). Nếu đúng mức từ: dùng luôn làm `words[]`, rồi **tự dựng lại `segments`** bằng
  cách gộp các từ liên tiếp thành câu/cụm theo dấu câu kết thúc (`. ? ! …`) hoặc khoảng lặng giữa 2 từ
  > 700ms (ngưỡng tạm, có thể chỉnh sau khi thấy dữ liệu thật) — **thay cho** việc dùng `chunks` mức câu
  > Whisper tự trả, vì khi xin mức từ sẽ không còn mức câu đi kèm.
  > Nếu phát hiện kết quả KHÔNG ở mức từ (provider bỏ qua tham số, trả lại y như `true`): giữ `segments` như
  > hiện tại (mức câu), và suy ra mốc từng từ bằng **nội suy tỉ lệ theo số ký tự** trong phạm vi
  > `[chunk.start, chunk.end]` của câu đó — đây là xấp xỉ, không phải mốc thật, nêu rõ trong
  > `04-nhat-ky-da-lam.md` khi hoàn tất và trong UI không khẳng định "chính xác tuyệt đối".
- **Không dựng forced-alignment service riêng** (ví dụ chạy thêm model CTC alignment/WhisperX) vì đây là
  một hạ tầng mới hoàn toàn (thêm service, thêm deploy, thêm chi phí vận hành) — không cân xứng với quy mô
  yêu cầu hiện tại (brief chỉ cần "nghe đúng khoảng chữ", không cần mốc chính xác tới mili-giây cho mục
  đích nghiên cứu ngữ âm). Nếu sau này độ chính xác nội suy không đủ dùng thực tế, cân nhắc forced-alignment
  như việc riêng.
- **Rủi ro lớn nhất chưa kiểm chứng được trong môi trường này:** không có `HF_TOKEN` + backend chạy thật ở
  đây để gọi thử Whisper với `return_timestamps: 'word'` và xem provider thật trả về gì. Sẽ code theo cả 2
  nhánh (thật + nội suy dự phòng) nhưng **chỉ xác nhận được nhánh nào thực sự kích hoạt sau khi chạy thật
  trên môi trường có token** — nêu rõ trong Kết quả thật.

**Model dữ liệu:**

```ts
// apps/voicescribe/src/types/transcription.ts (backend) và web/src/types.ts (frontend)
interface Word {
  id: string; // ổn định qua các lần sửa, dùng để map diff
  text: string;
  startMs: number;
  endMs: number;
}
```

- `recordings` (Postgres) thêm cột `words jsonb NOT NULL DEFAULT '[]'` — **danh sách từ cho CẢ bản ghi**,
  không lưu lồng trong từng segment (đúng theo yêu cầu "words = [...]" ở cấp bản ghi, để 1 từ bị cắt/dán
  giữa 2 đoạn không cần copy lại object từ, chỉ cần đổi `wordIds` của 2 đoạn liên quan).
- `LabeledSegment` (`types/diarization.ts`) thêm **field tùy chọn** `wordIds?: string[]` — **không bỏ**
  `start`/`end` (giữ nguyên, bắt buộc như cũ): khi có `wordIds`, `start`/`end` được **tính lại = mốc từ đầu
  tiên/cuối cùng trong `wordIds`** mỗi lần đổi (không lưu lệch tay); khi không có `wordIds` (bản ghi cũ,
  hoặc do nội suy fallback không đủ tin cậy để tách từ) thì `start`/`end` vẫn là nguồn sự thật duy nhất như
  hiện tại — đây chính là "phương án dự phòng" đã nêu trong yêu cầu. Giữ `start`/`end` bắt buộc (thay vì bỏ
  hẳn) để **không phải sửa lại** toàn bộ chỗ đang đọc trực tiếp `seg.start`/`seg.end` (khớp người nói theo
  overlap ở `mergeSpeakers.ts`, giới hạn/overlap-trim theo chunk ở `longAudioTranscription.ts`, export
  txt/docx/srt, thống kê thời lượng người nói) — giảm rủi ro phá vỡ các luồng đang chạy đúng, đổi tối thiểu
  cần thiết.
- Migration `006_recording_words`: `ALTER TABLE recordings ADD COLUMN words jsonb NOT NULL DEFAULT '[]'`.
  Bản ghi cũ: `words = []`, mọi `segments` cũ không có `wordIds` → tự động dùng nhánh dự phòng, không cần
  backfill gì thêm (không có dữ liệu từ gốc để backfill chính xác).

**Luồng sửa chữ (diff mức từ):**

- Khi người dùng sửa text 1 block (textarea hiện tại) hoặc dùng thao tác mới "Chuyển lên/xuống"/"Tách
  đoạn": so sánh text cũ–mới ở mức từ (tách theo khoảng trắng), dùng thuật toán diff mức từ (thêm thư viện
  `diff` — chưa có trong `package.json`, cần cài — chọn `diff` vì nhỏ, phổ biến, có hàm `diffWords` sẵn,
  không cần tự viết LCS). Từ khớp y nguyên → giữ nguyên `id`/mốc. Từ bị xóa → bỏ khỏi `wordIds` của đoạn đó
  (từ vẫn còn trong `words[]` cấp bản ghi, chỉ không đoạn nào tham chiếu — không cần dọn, nhẹ, tránh vỡ
  tham chiếu nếu Ctrl+Z khôi phục). Từ mới gõ/sửa chính tả → tạo `Word` mới, `startMs`/`endMs` nội suy
  = **trung bình cộng mốc 2 từ liền kề còn giữ được** (hoặc kéo dài từ liền kề gần nhất nếu ở đầu/cuối
  đoạn) — không làm lệch mốc các từ khác.
- "Chuyển lên đoạn trước" / "Chuyển xuống đoạn sau": bôi chọn 1 đoạn text con trong textarea, bấm nút →
  xác định các `wordIds` tương ứng (map theo diff mức từ giữa toàn bộ text của block và phần được chọn —
  dùng `window.getSelection()`/vị trí con trỏ trong textarea để biết offset ký tự, rồi so với
  text-đã-tách-từ để suy ra đúng dải `wordIds` con), cắt khỏi `wordIds` của block hiện tại, nối vào đầu
  (chuyển lên) hoặc cuối (chuyển xuống) `wordIds` của block liền kề — **mốc thời gian của các từ đó giữ
  nguyên 100%** (đây là điểm mấu chốt khớp đúng ví dụ "cô chú / dạ bây giờ ở bên Pháp" trong yêu cầu).
- "Tách đoạn tại vị trí con trỏ": chia `wordIds` hiện tại thành 2 nhóm theo vị trí con trỏ, tạo block mới
  cùng speaker, chèn ngay sau block gốc trong mảng `segments`.
- Đoạn rỗng sau khi chuyển hết chữ đi: dùng lại đúng cơ chế xóa-có-hoàn-tác của Việc A (không hỏi riêng,
  hiện toast xóa tự động kèm Hoàn tác — nhất quán với Việc A, đáp ứng đúng "tự xóa kèm nút Hoàn tác" là 1
  trong 2 lựa chọn yêu cầu đưa ra).

**Phát âm thanh theo từ, không theo mốc đoạn cũ:**

- `audioPlayer.ts`'s `playRange(start, end, loop)` giữ nguyên chữ ký (vẫn nhận 1 khoảng giây) — chỗ gọi nó
  (`playBlock` ở `RecordingDetailPage.tsx`) đổi cách tính `start`/`end` truyền vào: nếu block có `wordIds`,
  dùng mốc từ đầu/cuối **của danh sách từ hiện có** (không dùng `block.start`/`block.end` lưu sẵn — 2 giá
  trị này giờ chỉ là cache, luôn suy ra lại từ `wordIds` mỗi lần build block) — đúng yêu cầu cốt lõi "phát
  theo chữ đang có, không phụ thuộc ranh giới đoạn cũ".
- Đệm 80–150ms: trừ vào `start`, cộng vào `end` khi gọi `playRange`, kẹp trong `[0, durationSec]`.
- **Khoảng không liên tục** (từ dán từ chỗ xa, giữa các từ có khoảng hở lớn hơn ví dụ 2s): `playRange` hiện
  tại chỉ hỗ trợ 1 khoảng liên tục — thêm hàm mới `playSequence(ranges: {start,end}[], loop)` trong
  `audioPlayer.ts`, phát nối tiếp từng khoảng (nghe `timeupdate`, khi chạm `end` của khoảng hiện tại thì
  nhảy `currentTime` sang `start` của khoảng kế tiếp, hết mảng thì dừng/lặp). `playBlock` tính danh sách
  khoảng liền kề từ `wordIds` (gộp các từ có khoảng hở nhỏ, tách khoảng mới khi hở > ngưỡng), nếu có hơn 1
  khoảng thì gọi `playSequence` và hiện toast nhẹ "Đoạn có phần âm thanh không liên tục".
- **Highlight theo từ:** `SpeakerTranscript` hiện tô cả block đang phát (`playingBlockFrom`) — thêm tính
  `activeWordId` từ `currentTime` (so với mốc từng từ trong `words[]` của block đang phát), bọc mỗi từ
  trong `<span>` riêng khi render block đang active để tô đúng từ (chỉ render span-theo-từ cho block đang
  phát, các block khác vẫn render text thường — tránh phá vỡ hiệu năng/kiểu chữ khi không cần).

## Rủi ro

| Rủi ro                                                                                       | Mức        | Giảm thiểu                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider Inference không thực sự trả mốc theo từ dù gửi `return_timestamps: 'word'`          | Cao        | Có nhánh phát hiện + nội suy dự phòng theo tỉ lệ ký tự; nêu rõ đây là xấp xỉ, không phải mốc thật.                                                           |
| Nội suy tỉ lệ ký tự không khớp thực tế khi tốc độ nói không đều                              | Trung bình | Chấp nhận sai số ở mức "đủ nghe đúng khoảng chữ" như brief yêu cầu, không cam kết chính xác tuyệt đối.                                                       |
| Diff mức từ map sai khi người dùng sửa nhiều chỗ cùng lúc trong 1 lần lưu                    | Trung bình | Dùng thư viện `diff` đã kiểm chứng rộng rãi thay vì tự viết; test tay các kịch bản ở mục Kiểm chứng.                                                         |
| Thêm `wordIds` optional nhưng quên 1 chỗ đọc `seg.start/end` trực tiếp (export, thống kê...) | Trung bình | Không đổi ý nghĩa `start`/`end` bắt buộc — luôn đồng bộ lại từ `wordIds` khi có, mọi chỗ đọc cũ vẫn đúng.                                                    |
| `playSequence` mới có thể có bug đồng bộ `timeupdate` (nhảy khoảng không mượt)               | Thấp       | Giữ nguyên `playRange` cho trường hợp phổ biến (1 khoảng liên tục), chỉ dùng `playSequence` khi thực sự rời rạc.                                             |
| Việc B là thay đổi lớn, chưa có môi trường chạy thật (backend+Postgres+HF_TOKEN) ở máy này   | Cao        | Code đầy đủ cả 2 nhánh, nêu rõ "chưa kiểm chứng thật" ở phần Kết quả, khuyến nghị người dùng tự thử trên môi trường thật trước khi coi là ổn định hoàn toàn. |

## Kiểm chứng

- Backend: `npm run typecheck`/build sạch; test tay migration `006` (không chạy trên Railway thật).
- Frontend: `npm run typecheck`/`build`/`eslint` sạch.
- Tay (theo yêu cầu, khi có backend thật để thử):
  1. Xóa 1 đoạn → mất khỏi danh sách, toast "Đã xóa đoạn · Hoàn tác" ~8s, Ctrl+Z khôi phục đúng vị trí cũ.
  2. Gộp đoạn với đoạn trước/sau → text + mốc gộp đúng, phát lại nghe đủ cả 2 phần.
  3. Ví dụ "cô chú / dạ bây giờ ở bên Pháp": bôi chọn cụm đó ở đầu đoạn Sếp, bấm "Chuyển lên đoạn trước"
     (đoạn Chú) → nghe đoạn Chú phải nghe tới hết "...Pháp" rồi dừng; nghe đoạn Sếp phải bắt đầu từ sau cụm
     đó, không còn lẫn giọng Chú.
  4. Tách đoạn tại con trỏ → 2 đoạn mới, mốc đúng theo từ ở mỗi bên.
  5. Sửa lỗi chính tả 1 từ (không thêm/bớt số từ) → mốc các từ khác không đổi.
  6. Đóng mở lại app → segments/words vẫn đúng như đã lưu.
- **Chưa thể chạy được trong môi trường này:** không có backend+Postgres+HF_TOKEN local, nên không gọi
  được Whisper thật để xác nhận nhánh word-level có kích hoạt hay rơi về nội suy — phải chờ người dùng thử
  trên môi trường có token.

## Kết quả thật

### Việc A — Xóa/gộp đoạn (xong)

- Đã làm đúng theo plan: `deleteBlock`/`mergeWithNeighbor` thêm vào `web/src/lib/transcript.ts`;
  nút xóa (thùng rác) + gộp với đoạn trước/sau thêm vào `SpeakerTranscript` trong
  `web/src/components/TranscriptView.tsx` (luôn hiện khi Chỉnh sửa, không làm riêng nhánh cho cảm ứng —
  đơn giản hơn mà vẫn đáp ứng đúng yêu cầu "luôn hiện trên màn hình cảm ứng").
- Hoàn tác: khác dự kiến ban đầu một chút — thay vì dùng `useToast` sẵn có (API đó chỉ có
  `success`/`error`, không hỗ trợ nút hành động riêng + tự ẩn theo thời lượng tùy chỉnh), làm 1 thanh
  "Đã xóa đoạn · Hoàn tác" riêng trong `RecordingDetailPage.tsx` (state `lastDeleted` giữ snapshot
  `segments` trước khi xóa, `setTimeout` 8s dọn, Ctrl+Z gọi cùng hàm khi không đang gõ input/textarea) —
  không đổi `useToast` dùng chung để tránh ảnh hưởng toast success/error ở những nơi khác.
  - Giới hạn đã biết: chỉ nhớ lại **1 bước** gần nhất (không phải full undo-stack nhiều bước) — đủ cho
    yêu cầu "xóa nhầm 1 đoạn thì hoàn tác", không làm undo-stack vì brief không yêu cầu nhiều bước.
- Gộp đoạn: không có undo riêng cho gộp (brief không yêu cầu, chỉ yêu cầu undo cho xóa) — gộp sai thì
  tự sửa lại bằng tay (bấm sửa rồi tách câu) hoặc Ctrl+Z nếu gộp diễn ra ngay sau 1 lần xóa còn trong 8s
  (không áp dụng được cho gộp độc lập).
- Kiểm chứng thật đã chạy: `npm run typecheck` (`apps/voicescribe/web`) sạch; `npm run build` sạch
  (`tsc --noEmit` + `vite build`, không warning liên quan tới code sửa). Không có script `lint` riêng
  trong package này (khác giả định ban đầu trong plan gốc — không có eslint config riêng cho
  `apps/voicescribe/web` ngoài phần đã chạy ở các lần sửa trước, nên không chạy lại được).
  **Chưa chạy thật qua trình duyệt** — máy này không có backend+Postgres local đang chạy, nên chưa tận
  mắt xác nhận: nút xóa/gộp hiện đúng vị trí, toast hoàn tác tự ẩn đúng 8s, Ctrl+Z khôi phục đúng vị trí
  cũ trong mảng `segments`, phát lại/highlight vẫn đúng sau khi xóa/gộp. Người dùng cần tự thử trên môi
  trường thật trước khi coi Việc A là ổn định hoàn toàn.
- Chưa commit (theo quy tắc "chỉ commit khi người dùng yêu cầu").

### Việc B — Mốc thời gian đến từng từ (xong, theo đúng Hướng đi đã chốt)

- **Backend:** migration `006_recording_words` thêm cột `recordings.words`. `types/diarization.ts`
  thêm `Word` + `LabeledSegment.wordIds?`. `services/transcription.ts`: đổi sang gửi
  `return_timestamps: 'word'` (ép kiểu, ngoài schema chính thức như đã nêu trong Hướng đi), tự phát
  hiện kết quả có thực sự ở mức từ hay không (`wordLevel` — mỗi chunk không còn khoảng trắng bên
  trong), nếu đúng thì dựng lại `segments` bằng `segmentWords()` (cắt theo dấu câu/khoảng lặng >0.7s);
  nếu provider không trả mức từ thì dùng `interpolateWords()` (nội suy theo tỉ lệ ký tự — xấp xỉ, đã
  nêu rõ trong comment code). `longAudioTranscription.ts`'s `mergeChunkSegments` offset cả `words`
  theo từng chunk. `mergeSpeakers.ts`'s `mergeTranscriptWithSpeakers` đổi sang trả về
  `{segments, words}` — gán `id` (uuid) cho từng từ, tạo danh sách `words` cấp bản ghi; `jobs.ts` đơn
  giản hóa (gọi hàm này cả khi tắt/lỗi diarization, vì tự trả "Người nói 1" khi danh sách người nói
  rỗng — không cần nhánh riêng như code cũ). `recordingsRoutes.ts` thêm `parseWords()` + nhận
  `wordIds` trong `parseSegments()`, PATCH nhận thêm field `words`.
- **Frontend:** file mới `lib/words.ts` — `wordsOf`, `playbackRanges` (mốc phát theo từ thật, đệm
  80-150ms, tách khoảng khi hở >2s), `activeWordId`, `syncWordsOnEdit` (diff mức từ bằng thư viện
  `diff`, giữ nguyên id/mốc từ không đổi, nội suy mốc cho từ mới gõ/sửa chính tả theo 2 từ liền kề còn
  giữ được), `moveSelectionToNeighbor` ("Chuyển lên/xuống đoạn", dựa vào vị trí bôi chọn trong
  textarea), `splitSegmentAtCursor` ("Tách đoạn tại con trỏ"). `TranscriptView.tsx`: textarea báo lại
  vị trí chọn (`onSelect`), hiện nút Chuyển lên/Chuyển xuống (khi có bôi chọn) hoặc Tách đoạn (khi chỉ
  có con trỏ, không bôi chọn) ngay dưới ô sửa; đoạn đang phát (chế độ xem, không sửa) tô từng từ đang
  đọc qua `WordHighlighted`. `audioPlayer.ts` thêm `playSequence()` (phát nối tiếp nhiều khoảng, nhảy
  qua khoảng hở, dùng chung logic loop với `playRange`). `RecordingDetailPage.tsx`'s `playBlock` đổi
  sang tính khoảng phát thật từ `words` (không dùng `block.start/end` cũ cố định), báo toast "Đoạn có
  phần âm thanh không liên tục" khi phát hiện hở — `useToast` thêm loại `info` trung tính cho việc
  này. Việc A's "xóa/gộp đoạn" đã cập nhật đi kèm: gộp đoạn (`mergeWithNeighbor`) hiện **không** gộp
  `wordIds` của 2 đoạn — đoạn sau khi gộp rơi về dùng `start`/`end` (không còn mốc theo từ) — khác dự
  kiến ban đầu (không có trong plan gốc chi tiết hoá trường hợp này), chấp nhận vì gộp là hành động ít
  dùng và mốc cũ vẫn đúng ở mức đoạn.
- **Khác dự kiến trong plan gốc:**
  - Đơn vị mốc thời gian dùng **giây** (số thực), không dùng `ms` như plan ghi ban đầu — để khớp đúng
    quy ước `start`/`end` đã dùng xuyên suốt toàn bộ codebase (giây), tránh lỗi quy đổi đơn vị.
  - Nhánh nội suy (`interpolateWords`) **luôn chạy** khi provider không trả mức từ (không chỉ cho bản
    ghi cũ) — nghĩa là mọi bản ghi mới có `wordIds` ngay cả khi mốc chỉ là xấp xỉ, không chỉ bản ghi cũ
    mới rơi về "không có từ" như plan mô tả. Lý do: cho phép Chuyển lên/xuống/Tách đoạn hoạt động trên
    mọi bản ghi mới, không riêng trường hợp provider hỗ trợ mức từ thật — đổi lại độ chính xác câu
    "Chuyển chữ" trên dữ liệu nội suy sẽ không hoàn toàn chính xác tới từng mili giây.
- **Kiểm chứng thật đã chạy:** `npm run typecheck` sạch cho cả `apps/voicescribe` (backend) và
  `apps/voicescribe/web` (frontend); `npm run build` (frontend, gồm `tsc --noEmit` + `vite build`) sạch.
  Cài thêm `diff@5.2.0` + `@types/diff@5.2.3` vào `apps/voicescribe/web`.
- **Chưa kiểm chứng (quan trọng nhất):**
  - **Không gọi được Whisper thật** (không có `HF_TOKEN`/backend+Postgres chạy ở máy này) — **chưa
    biết thực tế provider có tôn trọng `return_timestamps: 'word'` hay không**. Đây là rủi ro lớn nhất
    đã nêu trong plan, vẫn chưa giải quyết được ở lần làm này — chỉ code đúng cả 2 nhánh (thật + nội
    suy), người dùng cần tự kiểm tra bằng cách tải 1 file ghi âm mới lên app thật và xem log/kết quả.
  - Chưa chạy migration `006` trên dữ liệu Railway thật.
  - Chưa tự tay thử qua trình duyệt kịch bản "cô chú / dạ bây giờ ở bên Pháp" hay bất kỳ kịch bản nào
    khác ở mục Kiểm chứng của plan — cần người dùng tự thử trên môi trường thật.
  - Không viết test tự động (app vẫn chưa có test runner nào cấu hình).
- Chưa commit (theo quy tắc "chỉ commit khi người dùng yêu cầu").
