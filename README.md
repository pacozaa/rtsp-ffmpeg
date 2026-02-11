# rtsp-ffmpeg

[![npm version](https://img.shields.io/npm/v/rtsp-ffmpeg.svg)](https://www.npmjs.com/package/rtsp-ffmpeg)
[![license](https://img.shields.io/npm/l/rtsp-ffmpeg.svg)](https://github.com/agsh/rtsp-ffmpeg/blob/master/LICENSE)
[![node version](https://img.shields.io/node/v/rtsp-ffmpeg.svg)](https://nodejs.org)

Lazy Node.js FFMpeg wrapper for streaming RTSP into MotionJPEG. It runs FFMpeg process only when someone is subscribed to its `data` event. Every `data` event contains one image `Buffer` object.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage Examples](#usage-examples)
- [API Documentation](#api-documentation)
- [Events](#events)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Lazy Loading**: FFMpeg process starts only when clients are listening
- **Automatic Cleanup**: Process stops when no listeners remain
- **Motion JPEG Streaming**: Converts RTSP streams to MJPEG format
- **Customizable Output**: Configure framerate, resolution, and quality
- **Multiple Stream Support**: Handle multiple camera streams simultaneously
- **Event-Driven**: Simple event-based API

## Prerequisites

- **Node.js**: Version 6 or higher
- **FFmpeg**: Must be installed on your system

## Installation

1. **Install FFmpeg** on your system:
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **Windows**: Download from [FFmpeg official website](https://www.ffmpeg.org/download.html)

2. **Install the package** in your project:
   ```bash
   npm install rtsp-ffmpeg
   ```

## Usage Examples

### Basic Example with Socket.io

This example demonstrates streaming RTSP to a web browser using [Socket.io](https://socket.io/).

#### Server Code

```javascript
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const rtsp = require('rtsp-ffmpeg');

server.listen(6147, () => {
  console.log('Server listening on port 6147');
});

// RTSP stream URL
const uri = 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov';
const stream = new rtsp.FFMpeg({ input: uri });

io.on('connection', (socket) => {
  const pipeStream = (data) => {
    socket.emit('data', data.toString('base64'));
  };
  
  // Add listener when client connects
  stream.on('data', pipeStream);
  
  // Remove listener when client disconnects
  socket.on('disconnect', () => {
    stream.removeListener('data', pipeStream);
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
```

#### Client Code (index.html)

**Simple approach** (not recommended for production):

```html
<!DOCTYPE html>
<html>
<head>
  <title>RTSP Stream</title>
</head>
<body>
  <img id="img" alt="Live stream" />
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const img = document.getElementById('img');
    const socket = io('');
    
    socket.on('data', (data) => {
      img.src = 'data:image/jpeg;base64,' + data;
    });
  </script>
</body>
</html>
```

> **Note**: For better performance with large resolution images or high framerates, use canvas rendering instead of direct image source updates. See the [canvas example](https://github.com/agsh/rtsp-ffmpeg/blob/master/example/index-canvas.html) by [Seikon](https://github.com/Seikon).

### Multiple Streams Example

For handling multiple camera streams, see [/example/server.js](/example/server.js).

For high-resolution streams using canvas rendering, check [/example/server-canvas.js](/example/server-canvas.js).

## API Documentation

### Constructor

Create a new FFMpeg stream instance.

```javascript
const FFMpeg = require('rtsp-ffmpeg').FFMpeg;

const stream = new FFMpeg(options);
```

#### Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `input` | String | Yes | - | Stream URI (e.g., `rtsp://localhost:8554/stream`) |
| `rate` | Number | No | `10` | Output framerate (frames per second) |
| `resolution` | String | No | - | Output resolution in `WxH` format (e.g., `'640x480'`) |
| `quality` | Number | No | `3` | JPEG compression quality level (1-31, lower is better) |
| `arguments` | Array | No | `[]` | Custom FFmpeg arguments |

#### Example

```javascript
const stream = new FFMpeg({
  input: 'rtsp://localhost:8554/stream',
  rate: 10,
  resolution: '640x480',
  quality: 3
});
```

### Methods

#### `start()`

Manually start the FFMpeg process. Typically not needed as the process starts automatically when listeners are added.

```javascript
stream.start();
```

#### `stop()`

Stop the FFMpeg process and close the stream.

```javascript
stream.stop();
```

#### `restart()`

Restart the FFMpeg process with current settings.

```javascript
stream.restart();
```

### Static Properties

#### `FFMpeg.cmd`

Path or command to the FFmpeg executable. Modify this if FFmpeg is not in your system PATH.

```javascript
const FFMpeg = require('rtsp-ffmpeg').FFMpeg;

// Windows example
FFMpeg.cmd = 'C:\\ffmpeg\\bin\\ffmpeg.exe';

// Linux example
FFMpeg.cmd = '/usr/local/bin/ffmpeg';
```

## Events

The FFMpeg instance inherits from Node.js `EventEmitter` and emits the following events:

### `data`

Emitted when a complete JPEG frame is received.

**Callback Arguments:**
- `buffer` (Buffer): Image data as a Buffer object

**Example:**
```javascript
stream.on('data', (imageBuffer) => {
  // Process the image buffer
  console.log('Received frame, size:', imageBuffer.length);
});
```

### `start`

Emitted when the FFMpeg process starts.

**Example:**
```javascript
stream.on('start', () => {
  console.log('Stream started');
});
```

### `stop`

Emitted when the FFMpeg process stops.

**Example:**
```javascript
stream.on('stop', () => {
  console.log('Stream stopped');
});
```

## Error Handling

### Common Errors

#### `Error: spawn ffmpeg ENOENT`

**Cause**: FFmpeg executable not found in system PATH.

**Solution**: 
1. Ensure FFmpeg is installed on your system
2. Set the correct path using `FFMpeg.cmd`:

```javascript
const FFMpeg = require('rtsp-ffmpeg').FFMpeg;
FFMpeg.cmd = '/path/to/ffmpeg'; // or 'C:\\path\\to\\ffmpeg.exe' on Windows
```

#### Stream Connection Errors

**Cause**: Unable to connect to RTSP stream (invalid URL, network issues, authentication failure).

**Solution**: 
- Verify the RTSP URL is correct
- Check network connectivity
- Ensure authentication credentials are included in the URL if required: `rtsp://username:password@host:port/path`

### Handling Errors in Your Application

```javascript
stream.on('error', (error) => {
  console.error('Stream error:', error);
  // Implement retry logic or notify users
});
```

## Troubleshooting

### No Frames Received

1. **Check FFmpeg installation**: Run `ffmpeg -version` in terminal
2. **Verify RTSP URL**: Test the URL with FFmpeg directly:
   ```bash
   ffmpeg -i rtsp://your-stream-url -f image2 -vframes 1 test.jpg
   ```
3. **Check network connectivity**: Ensure the RTSP source is reachable
4. **Firewall settings**: Ensure ports are not blocked

### Low Frame Rate

- Increase the `rate` option value
- Check network bandwidth
- Verify source stream quality

### High Memory Usage

- Reduce `resolution` to lower values
- Increase `quality` value (lower quality, smaller file size)
- Reduce `rate` to lower framerate

### FFmpeg Process Not Stopping

The process should automatically stop when all listeners are removed. If it doesn't:

```javascript
// Manually stop the stream
stream.removeAllListeners('data');
stream.stop();
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Contributors

- [Andrew D.Laptev](https://github.com/agsh) - Original author
- [Seikon](https://github.com/Seikon) - Canvas rendering examples
- [Igor Koval](https://github.com/igkvl) - Contributions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Repository**: [agsh/rtsp-ffmpeg](https://github.com/agsh/rtsp-ffmpeg)  
**NPM Package**: [rtsp-ffmpeg](https://www.npmjs.com/package/rtsp-ffmpeg)

