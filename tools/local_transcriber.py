"""Local LifeOS speech-to-text service powered by faster-whisper."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from faster_whisper import WhisperModel
import json, os, tempfile

MODEL = WhisperModel("small", device="cpu", compute_type="int8")

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/transcribe":
            self.send_error(404); return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 50 * 1024 * 1024:
            self.send_error(400, "Audio file is required"); return
        suffix = self.headers.get("X-LifeOS-Audio-Extension", ".m4a")
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as audio:
            audio.write(self.rfile.read(length)); path = audio.name
        try:
            segments, _ = MODEL.transcribe(path, language="ru", vad_filter=True)
            body = json.dumps({"text": " ".join(s.text.strip() for s in segments).strip()}, ensure_ascii=False).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json; charset=utf-8"); self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
        finally:
            os.unlink(path)

if __name__ == "__main__":
    print("LifeOS local transcription listening on http://0.0.0.0:8790")
    ThreadingHTTPServer(("0.0.0.0", 8790), Handler).serve_forever()
