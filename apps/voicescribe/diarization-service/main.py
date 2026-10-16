"""
VoiceScribe diarization sidecar.

A small, internal-only HTTP service wrapping pyannote/speaker-diarization-3.1
(local inference, no hosted API exists for this model — see
docs/superpowers/specs for the research that established that).
Called by the Node backend over plain HTTP; never exposed to the
internet directly.
"""

import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

# torchcodec (an audio-decoding dependency of pyannote.audio>=4) ships its
# own libtorchcodec_core*.dll per FFmpeg major version, but those DLLs
# depend on real FFmpeg *shared* libraries (avcodec-*.dll etc.) being on
# PATH — a static "full_build" FFmpeg install (fine for the Node backend's
# ffmpeg-based chunking) does not provide these and the load fails with a
# misleading FileNotFoundError. Point PATH at a shared FFmpeg build
# (download: https://github.com/BtbN/FFmpeg-Builds releases,
# "...win64-gpl-shared.zip") extracted next to this file, before importing
# anything that transitively imports torchcodec.
_FFMPEG_SHARED_BIN = Path(__file__).parent / "ffmpeg-shared" / "ffmpeg-master-latest-win64-gpl-shared" / "bin"
if _FFMPEG_SHARED_BIN.is_dir():
    os.environ["PATH"] = f"{_FFMPEG_SHARED_BIN}{os.pathsep}{os.environ.get('PATH', '')}"

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from pyannote.audio import Pipeline

app = FastAPI(title="VoiceScribe Diarization Sidecar")

_pipeline: Optional[Pipeline] = None


def get_pipeline() -> Pipeline:
    """Loads the pipeline once and reuses it — loading involves
    downloading/initializing model weights, which is far too slow to
    redo per request."""
    global _pipeline
    if _pipeline is None:
        token = os.environ.get("HF_TOKEN")
        if not token:
            raise HTTPException(
                status_code=500,
                detail="HF_TOKEN chưa được cấu hình cho diarization service.",
            )
        try:
            _pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1", token=token
            )
        except Exception as exc:  # noqa: BLE001 - surfaced as a clear 503 below
            raise HTTPException(
                status_code=503,
                detail=(
                    "Không tải được model diarization. Kiểm tra đã accept "
                    "điều khoản sử dụng trên Hugging Face cho "
                    "pyannote/segmentation-3.0 và pyannote/speaker-diarization-3.1 "
                    f"chưa. Chi tiết: {exc}"
                ),
            ) from exc
    return _pipeline


class SpeakerSegment(BaseModel):
    speaker: str
    start: float
    end: float


class DiarizeResponse(BaseModel):
    segments: list[SpeakerSegment]
    speakerCount: int


@app.post("/diarize", response_model=DiarizeResponse)
async def diarize(
    audio: UploadFile = File(...),
    num_speakers: Optional[int] = Form(default=None),
) -> DiarizeResponse:
    pipeline = get_pipeline()

    suffix = os.path.splitext(audio.filename or "audio.wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        raw_path = tmp.name

    # Re-encode to 16kHz mono WAV before handing it to pyannote: feeding
    # compressed formats (mp3 in particular) directly can trigger a
    # sample-count mismatch inside pyannote's chunk cropping (observed:
    # "resulted in 479471 samples instead of the expected 480000
    # samples"), from encoder/decoder frame-boundary rounding. A clean
    # WAV sidesteps that class of error entirely — the same reason
    # audioChunker.ts does this for Whisper on the Node side.
    wav_path = raw_path + ".wav"
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", raw_path, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav_path],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as exc:
        os.unlink(raw_path)
        raise HTTPException(
            status_code=400,
            detail=f"Không chuyển đổi được file âm thanh: {exc.stderr.decode(errors='replace')[:300]}",
        ) from exc

    try:
        kwargs = {}
        if num_speakers is not None:
            if num_speakers < 1:
                raise HTTPException(
                    status_code=400, detail="num_speakers phải lớn hơn 0."
                )
            kwargs["num_speakers"] = num_speakers

        try:
            output = pipeline(wav_path, **kwargs)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi khi chạy diarization: {exc}",
            ) from exc

        segments: list[SpeakerSegment] = []
        speakers: set[str] = set()
        for turn, _, speaker in output.speaker_diarization.itertracks(yield_label=True):
            segments.append(
                SpeakerSegment(speaker=speaker, start=turn.start, end=turn.end)
            )
            speakers.add(speaker)

        return DiarizeResponse(segments=segments, speakerCount=len(speakers))
    finally:
        os.unlink(raw_path)
        if os.path.exists(wav_path):
            os.unlink(wav_path)


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}
