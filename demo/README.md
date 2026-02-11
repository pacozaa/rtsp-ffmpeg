# RTSP-FFmpeg Demo Application

A complete demo application showcasing the rtsp-ffmpeg library's capabilities for streaming RTSP video feeds to web browsers in real-time.

## Features

- 🎥 Real-time RTSP to JPEG streaming
- 🖥️ Clean, modern web interface
- 📊 Live FPS and frame count statistics
- 🔄 Start/Stop controls for each stream
- 💡 Lazy loading - FFmpeg only runs when clients are connected
- 🎨 Responsive design with beautiful gradients

## Prerequisites

Before running this demo, ensure you have:

1. **Node.js** (version 6 or higher)
2. **FFmpeg** installed and accessible from command line
   - Download from: http://www.ffmpeg.org/
   - Verify installation: `ffmpeg -version`

## Installation

1. Navigate to the demo directory:
   ```bash
   cd demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Demo

Start the server:
```bash
npm start
```

Then open your browser and navigate to:
```
http://localhost:3000
```

## How It Works

1. The server creates FFmpeg streams for each configured RTSP source
2. When you click "Start Stream", the browser connects via Socket.io
3. FFmpeg spawns and begins converting RTSP video to JPEG frames
4. Each frame is sent to the browser and displayed on a canvas
5. When you stop or disconnect, FFmpeg automatically stops (lazy loading)

## Demo Streams

The demo includes two public RTSP streams:

1. **Big Buck Bunny** - A classic test video
2. **Hessdalen Camera** - Live camera feed from Norway

These are publicly available streams and may occasionally be unavailable.

## Customizing

### Adding Your Own RTSP Stream

Edit `server.js` and add your stream to the `streams` array:

```javascript
const streams = [
  {
    name: 'My Camera',
    uri: 'rtsp://your-camera-ip:554/stream'
  }
];
```

### Adjusting Stream Quality

Modify the FFmpeg options in `server.js`:

```javascript
const ffmpegStream = new rtsp.FFMpeg({
  input: stream.uri,
  resolution: '1280x720',  // Higher resolution
  quality: 1,              // Better quality (0-31, lower is better)
  rate: 15                 // Higher frame rate
});
```

## Troubleshooting

### FFmpeg not found

If you get an error like `Error: spawn ffmpeg ENOENT`:

1. Verify FFmpeg is installed: `ffmpeg -version`
2. If the FFmpeg command differs on your system, set it in your code:
   ```javascript
   const rtsp = require('rtsp-ffmpeg');
   rtsp.FFMpeg.cmd = '/path/to/ffmpeg';  // e.g., 'C:\\ffmpeg.exe' on Windows
   ```

### Stream not loading

- Check that the RTSP URL is correct and accessible
- Verify your firewall allows RTSP connections
- Some streams may be temporarily unavailable
- Check the server console for error messages

### Poor performance

- Reduce the resolution: `resolution: '320x240'`
- Lower the frame rate: `rate: 5`
- Increase quality value: `quality: 10`

## Architecture

```
Browser                Server              FFmpeg
   |                      |                   |
   |-- Connect Socket --->|                   |
   |                      |--- Spawn -------->|
   |                      |<-- JPEG frames ---|
   |<-- Emit 'image' -----|                   |
   |                      |                   |
   |-- Disconnect ------->|                   |
   |                      |--- Kill --------->|
```

## Learn More

- Main library: [rtsp-ffmpeg](https://github.com/agsh/rtsp-ffmpeg)
- Socket.io: [https://socket.io/](https://socket.io/)
- FFmpeg: [https://ffmpeg.org/](https://ffmpeg.org/)

## License

MIT
