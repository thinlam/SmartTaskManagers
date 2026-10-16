import { readFileSync } from 'node:fs';
import { loadConfig } from '../config/env.js';
import { transcribeAudio } from '../services/transcription.js';
import { TranscriptionError } from '../types/transcription.js';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function main() {
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.error('Cách dùng: tsx src/scripts/smoke-test.ts <đường-dẫn-file-audio>');
    process.exit(1);
  }

  const config = loadConfig();
  const audio = readFileSync(audioPath);

  console.log(`Đang gửi "${audioPath}" (${(audio.length / 1024 / 1024).toFixed(2)} MB) tới openai/whisper-large-v3...`);

  try {
    const result = await transcribeAudio({
      hfToken: config.hfToken,
      audio,
      fileName: audioPath,
    });

    console.log('\n=== KẾT QUẢ ===');
    console.log(`Thời gian xử lý: ${(result.processingTimeMs / 1000).toFixed(1)}s`);
    console.log(`Số đoạn (segments): ${result.segments.length}`);
    console.log('\n--- Toàn văn ---');
    console.log(result.text);

    if (result.segments.length > 0) {
      console.log('\n--- Theo đoạn (có mốc thời gian) ---');
      for (const seg of result.segments) {
        console.log(`[${formatTimestamp(seg.start)} - ${formatTimestamp(seg.end)}] ${seg.text}`);
      }
    } else {
      console.log('\n(Không có timestamp segments trong kết quả trả về)');
    }
  } catch (err) {
    if (err instanceof TranscriptionError) {
      console.error(`\nLỗi: ${err.message}`);
      if (err.cause_) {
        console.error('(Chi tiết lỗi gốc đã ghi log phía dưới cho mục đích debug — không hiển thị cho người dùng cuối)');
        console.error(err.cause_);
      }
      process.exit(1);
    }
    throw err;
  }
}

main();
