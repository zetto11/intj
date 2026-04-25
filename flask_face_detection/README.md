# Flask OpenCV Face Detection (IP Camera / RTSP)

## 1) Install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Configure camera URL
Set your IP webcam or RTSP URL:

```bash
export IP_CAMERA_URL="http://192.168.x.x:8080/video"
# or
export IP_CAMERA_URL="rtsp://user:pass@camera-ip:554/stream"
```

## 3) Run
```bash
python app.py
```

Open:
- `http://localhost:5000/camera`
- stream endpoint: `http://localhost:5000/video_feed`

## Notes
- Uses Haar Cascade (`haarcascade_frontalface_default.xml`) for real-time face detection.
- If the camera disconnects, the app will retry connection automatically.
- For better FPS, reduce stream resolution from your IP camera app.
