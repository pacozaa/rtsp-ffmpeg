/**
 * RTSP-FFmpeg Demo Server
 * 
 * This demo streams RTSP video feeds and converts them to JPEG images
 * that are displayed in a web browser using Socket.io
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const rtsp = require('rtsp-ffmpeg');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Public RTSP stream URLs for demo
// These are publicly available test streams
const streams = [
  {
    name: 'Big Buck Bunny',
    uri: 'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov'
  },
  {
    name: 'Hessdalen Camera',
    uri: 'rtsp://freja.hiof.no:1935/rtplive/definst/hessdalen03.stream'
  }
];

// Create FFmpeg streams for each RTSP source
const rtspStreams = streams.map((stream, index) => {
  const ffmpegStream = new rtsp.FFMpeg({
    input: stream.uri,
    resolution: '640x480',
    quality: 3,
    rate: 10
  });

  // Log when streams start and stop
  ffmpegStream.on('start', () => {
    console.log(`Stream ${index} (${stream.name}) started`);
  });

  ffmpegStream.on('stop', () => {
    console.log(`Stream ${index} (${stream.name}) stopped`);
  });

  return {
    name: stream.name,
    stream: ffmpegStream
  };
});

// Serve static files (only socket.io client library)
// Note: This is a demo application. For production use, consider:
// - Adding rate limiting to prevent abuse
// - Restricting static file access
// - Adding authentication and authorization

// Main page route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send available streams info to client
  socket.emit('streams', streams.map((s, i) => ({ id: i, name: s.name })));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Create namespace for each stream
rtspStreams.forEach((rtspStream, index) => {
  const namespace = io.of(`/stream${index}`);
  
  namespace.on('connection', (socket) => {
    console.log(`Client connected to stream ${index} (${rtspStream.name})`);
    
    // Pipe stream data to client
    const dataHandler = (imageBuffer) => {
      socket.emit('image', imageBuffer);
    };
    
    rtspStream.stream.on('data', dataHandler);
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected from stream ${index}`);
      rtspStream.stream.removeListener('data', dataHandler);
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`RTSP-FFmpeg Demo Server`);
  console.log(`=================================`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`\nMake sure FFmpeg is installed on your system!`);
  console.log(`=================================\n`);
});
