# VoiceScribe Diarization Sidecar

Speaker diarization for VoiceScribe. Wraps `pyannote/speaker-diarization-3.1`
(local Python inference — there is no hosted HTTP API for this model; see
the research note in the project's chat history / commit message for
Bước 3). Called by the Node backend over plain HTTP; not meant to be
exposed to the internet.

## Setup

1. **Python 3.13** (already matches what's on this machine).
   ```
   python -m venv .venv
   .venv\Scripts\activate       # Windows
   pip install -r requirements.txt
   ```

2. **Accept the gated model terms on Hugging Face**, logged in as the
   same account whose token you'll use:
   - https://huggingface.co/pyannote/segmentation-3.0
   - https://huggingface.co/pyannote/speaker-diarization-3.1
   - https://huggingface.co/pyannote/speaker-diarization-community-1
     (pulled in transitively by pyannote.audio 4.x — also gated)

3. **Shared FFmpeg build.** `pyannote.audio` 4.x depends on `torchcodec`
   for audio decoding, which needs real FFmpeg *shared* libraries
   (`avcodec-*.dll` etc.) on `PATH` — a static "full_build" FFmpeg
   install (fine for the Node backend's own ffmpeg-based chunking) does
   **not** provide these, and torchcodec fails with a misleading
   `FileNotFoundError` for every FFmpeg version it tries.

   Download a **shared** Windows build and extract it next to this file:
   ```
   curl -L -o ffmpeg-shared.zip https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip
   # extract so this path exists:
   #   diarization-service/ffmpeg-shared/ffmpeg-master-latest-win64-gpl-shared/bin/avcodec-*.dll
   ```
   `main.py` automatically prepends that `bin/` directory to `PATH` at
   startup if the folder exists — no manual `PATH` edit needed once
   it's extracted in place.

4. **Run it:**
   ```
   set HF_TOKEN=hf_...
   uvicorn main:app --host 127.0.0.1 --port 8008
   ```
   The Node backend talks to it via `DIARIZATION_SERVICE_URL`
   (defaults to `http://127.0.0.1:8008`).

## Known limitations

- First request after startup is slow (model weights load lazily on
  first call, not at process start).
- CPU-only inference: diarizing N minutes of audio takes roughly
  2-3x N minutes on a typical laptop CPU — much slower than the
  Whisper transcription step. A GPU box would be far faster; not set
  up here.
- Diarization runs on the whole uploaded file in memory, not chunked
  like the Whisper path — very long files (an hour+) may be slow or
  memory-heavy. Not yet load-tested beyond ~1 minute of real audio.
