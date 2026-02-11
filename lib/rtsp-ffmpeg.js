'use strict';

/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 30.03.15.
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { Buffer } = require('buffer');

/**
 * Stream class
 * @param {object} options
 * @param {string} options.input Stream uri, for example rtsp://freja.hiof.no:1935/rtplive/definst/hessdalen03.stream
 * @param {number|string} [options.rate] Framerate
 * @param {string} [options.resolution] Resolution in WxH format
 * @param {string|number} [options.quality] JPEG quality
 * @param {Array<string>} [options.arguments] Custom arguments for ffmpeg
 */
class FFMpeg extends EventEmitter {
	/**
	 * FFMpeg command name
	 * @type {string}
	 */
	static cmd = 'ffmpeg';

	/**
	 * Delay in milliseconds before restarting after a clean close
	 * @type {number}
	 */
	static RESTART_DELAY_MS = 1000;

	constructor(options) {
		super();
		
		if (options.input) {
			this.input = options.input;
		} else {
			throw new Error('no `input` parameter');
		}
		this.rate = options.rate || 10;
		this.resolution = options.resolution;
		this.quality = (options.quality === undefined || options.quality === "") ? 3 : options.quality;
		this.arguments = options.arguments || [];
		this.buff = Buffer.from(''); // Store the entire data image into this variable. This attribute is replaced each time a full image is received from the stream.

		this.on('newListener', this._onNewListener.bind(this));
		this.on('removeListener', this._onRemoveListener.bind(this));
	}

	_onNewListener(event) {
		if (event === 'data' && this.listeners(event).length === 0) {
			this.start();
		}
	}

	_onRemoveListener(event) {
		if (event === 'data' && this.listeners(event).length === 0) {
			this.stop();
		}
	}

	_args() {
		return this.arguments.concat([
			'-loglevel', 'quiet',
			'-i', this.input,
			'-r', this.rate.toString()
		],
			this.quality ? ['-q:v', this.quality.toString()] : [],
			this.resolution ? ['-s', this.resolution] : [],
		[
			// '-vf', 'fps=25',
			// '-b:v', '32k',
			'-f', 'image2',
			'-update', '1',
			'-'
		]);
	}

	/**
	 * Start ffmpeg spawn process
	 */
	start() {
		this.child = spawn(FFMpeg.cmd, this._args());
		this.child.stdout.on('data', (data) => {
			//The image can be composed of one or multiple chunk when receiving stream data.
			//Store all bytes into an array until we meet flag "FF D9" that mean it's the end of the image then we can send all data in order to display the full image.
			if (data.length > 1) {
				this.buff = Buffer.concat([this.buff, data]);

				const secondLastHex = data[data.length - 2].toString(16);
				const lastHex = data[data.length - 1].toString(16);

				if (secondLastHex === "ff" && lastHex === "d9") {
					this.emit('data', this.buff);
					this.buff = Buffer.from('');
				}
			}
		});
		this.child.stderr.on('data', (data) => {
			throw new Error(data);
		});
		this.emit('start');
		this.child.on('close', (code) => {
			if (code === 0) {
				setTimeout(() => this.start(), FFMpeg.RESTART_DELAY_MS);
			}
		});
		this.child.on('error', (err) => {
			if (err.code === 'ENOENT') {
				throw new Error('FFMpeg executable wasn\'t found. Install this package and check FFMpeg.cmd property');
			} else {
				throw err;
			}
		});
	}

	/**
	 * Stop ffmpeg spawn process
	 */
	stop() {
		if (this.child) {
			this.child.kill();
		}
		delete this.child;
		this.emit('stop');
	}

	/**
	 * Restart ffmpeg spawn process
	 */
	restart() {
		if (this.child) {
			this.stop();
			this.start();
		}
	}
}

if (typeof Proxy === 'function') {
	const ProxyFFMpeg = new Proxy(FFMpeg, {
		set: (target, property, value) => {
			if (property !== 'super_' && target[property] !== undefined) {
				target.restart();
			}
			target[property] = value;
			return true;
		}
	});
	module.exports.FFMpeg = ProxyFFMpeg;
} else {
	module.exports.FFMpeg = FFMpeg;
}
