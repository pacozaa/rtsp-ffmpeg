/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 30.03.15.
 */

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const rtsp = require('../lib/rtsp-ffmpeg');

// use rtsp = require('rtsp-ffmpeg') instead if you have install the package
server.listen(6147, () => {
	console.log('Listening on localhost:6147');
});


const cams = [
		'rtsp://wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_115k.mov',
		'rtsp://freja.hiof.no:1935/rtplive/definst/hessdalen03.stream',
		'udp://localhost:1234'
	].map((uri, i) => {
		const stream = new rtsp.FFMpeg({input: uri, resolution: '320x240', quality: 3});
		stream.on('start', () => {
			console.log('stream ' + i + ' started');
		});
		stream.on('stop', () => {
			console.log('stream ' + i + ' stopped');
		});
		return stream;
	});

cams.forEach((camStream, i) => {
	const ns = io.of('/cam' + i);
	ns.on('connection', (wsocket) => {
		console.log('connected to /cam' + i);
		const pipeStream = (data) => {
			wsocket.emit('data', data);
		};
		camStream.on('data', pipeStream);

		wsocket.on('disconnect', () => {
			console.log('disconnected from /cam' + i);
			camStream.removeListener('data', pipeStream);
		});
	});
});

io.on('connection', (socket) => {
	socket.emit('start', cams.length);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});
