import os
import time
from typing import Generator, Optional, Tuple

import cv2
from flask import Flask, Response, render_template

app = Flask(__name__)


class IPCameraFaceDetector:
    """Read frames from an IP/RTSP stream, run face detection, and provide JPEG frames."""

    def __init__(self, stream_url: str):
        self.stream_url = stream_url
        self.cap: Optional[cv2.VideoCapture] = None
        self.last_attempt_ts = 0.0
        self.reconnect_interval_sec = 2.0

        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            raise RuntimeError(f"Could not load Haar Cascade from: {cascade_path}")

    def _open_camera(self) -> bool:
        now = time.time()
        if now - self.last_attempt_ts < self.reconnect_interval_sec:
            return False

        self.last_attempt_ts = now

        if self.cap is not None:
            self.cap.release()

        self.cap = cv2.VideoCapture(self.stream_url)

        # Optional tuning for smoother streams.
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        return self.cap.isOpened()

    def _read_frame(self) -> Optional[cv2.typing.MatLike]:
        if self.cap is None or not self.cap.isOpened():
            if not self._open_camera():
                return None

        success, frame = self.cap.read()
        if not success or frame is None:
            if self.cap is not None:
                self.cap.release()
                self.cap = None
            return None

        return frame

    def process_frame(self, frame: cv2.typing.MatLike) -> cv2.typing.MatLike:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            cv2.putText(
                frame,
                "Face",
                (x, max(20, y - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2,
                cv2.LINE_AA,
            )

        return frame

    def get_processed_jpeg(self) -> Optional[bytes]:
        frame = self._read_frame()
        if frame is None:
            return None

        processed = self.process_frame(frame)
        ok, buffer = cv2.imencode(".jpg", processed)
        if not ok:
            return None

        return buffer.tobytes()

    def release(self) -> None:
        if self.cap is not None:
            self.cap.release()
            self.cap = None


STREAM_URL = os.getenv("IP_CAMERA_URL", "http://127.0.0.1:8080/video")
face_stream = IPCameraFaceDetector(STREAM_URL)


def generate_frames() -> Generator[bytes, None, None]:
    while True:
        jpg = face_stream.get_processed_jpeg()
        if jpg is None:
            # If disconnected/unavailable, keep response alive and retry.
            time.sleep(0.08)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + jpg + b"\r\n"
        )


@app.route("/")
def home() -> str:
    return render_template("camera.html", stream_url=STREAM_URL)


@app.route("/camera")
def camera_page() -> str:
    return render_template("camera.html", stream_url=STREAM_URL)


@app.route("/video_feed")
def video_feed() -> Response:
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame",
    )


@app.teardown_appcontext
def _cleanup(_exc: Optional[BaseException]) -> None:
    face_stream.release()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)
