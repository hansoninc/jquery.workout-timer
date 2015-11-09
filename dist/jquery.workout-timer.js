/*! workout-timer - v0.0.1 - 2015-11-09
* Copyright (c) 2015 Dave Rodriguez; Licensed MIT */
/*!
 * jQuery-runner - v2.3.3 - 2014-08-06
 * https://github.com/jylauril/jquery-runner/
 * Copyright (c) 2014 Jyrki Laurila <https://github.com/jylauril>
 */
(function() {
  var Runner, formatTime, meta, pad, runners, uid, _$, _requestAnimationFrame, _uid;

  meta = {
    version: "2.3.3",
    name: "jQuery-runner"
  };

  _$ = this.jQuery || this.Zepto || this.$;

  if (!(_$ && _$.fn)) {
    throw new Error('[' + meta.name + '] jQuery or jQuery-like library is required for this plugin to work');
  }

  runners = {};

  pad = function(num) {
    return (num < 10 ? '0' : '') + num;
  };

  _uid = 1;

  uid = function() {
    return 'runner' + _uid++;
  };

  _requestAnimationFrame = (function(win, raf) {
    return win['r' + raf] || win['webkitR' + raf] || win['mozR' + raf] || win['msR' + raf] || function(fn) {
      return setTimeout(fn, 30);
    };
  })(this, 'equestAnimationFrame');

  formatTime = function(time, settings) {
    var i, len, ms, output, prefix, separator, step, steps, value, _i, _len;
    settings = settings || {};
    steps = [3600000, 60000, 1000, 10];
    separator = ['', ':', ':', '.'];
    prefix = '';
    output = '';
    ms = settings.milliseconds;
    len = steps.length;
    value = 0;
    if (time < 0) {
      time = Math.abs(time);
      prefix = '-';
    }
    for (i = _i = 0, _len = steps.length; _i < _len; i = ++_i) {
      step = steps[i];
      value = 0;
      if (time >= step) {
        value = Math.floor(time / step);
        time -= value * step;
      }
      if ((value || i > 1 || output) && (i !== len - 1 || ms)) {
        output += (output ? separator[i] : '') + pad(value);
      }
    }
    return prefix + output;
  };

  Runner = (function() {
    function Runner(items, options, start) {
      var id;
      if (!(this instanceof Runner)) {
        return new Runner(items, options, start);
      }
      this.items = items;
      id = this.id = uid();
      this.settings = _$.extend({}, this.settings, options);
      runners[id] = this;
      items.each(function(index, element) {
        _$(element).data('runner', id);
      });
      this.value(this.settings.startAt);
      if (start || this.settings.autostart) {
        this.start();
      }
    }

    Runner.prototype.running = false;

    Runner.prototype.updating = false;

    Runner.prototype.finished = false;

    Runner.prototype.interval = null;

    Runner.prototype.total = 0;

    Runner.prototype.lastTime = 0;

    Runner.prototype.startTime = 0;

    Runner.prototype.lastLap = 0;

    Runner.prototype.lapTime = 0;

    Runner.prototype.settings = {
      autostart: false,
      countdown: false,
      stopAt: null,
      startAt: 0,
      milliseconds: true,
      format: null
    };

    Runner.prototype.value = function(value) {
      this.items.each((function(_this) {
        return function(item, element) {
          var action;
          item = _$(element);
          action = item.is('input') ? 'val' : 'text';
          item[action](_this.format(value));
        };
      })(this));
    };

    Runner.prototype.format = function(value) {
      var format;
      format = this.settings.format;
      format = _$.isFunction(format) ? format : formatTime;
      return format(value, this.settings);
    };

    Runner.prototype.update = function() {
      var countdown, delta, settings, stopAt, time;
      if (!this.updating) {
        this.updating = true;
        settings = this.settings;
        time = _$.now();
        stopAt = settings.stopAt;
        countdown = settings.countdown;
        delta = time - this.lastTime;
        this.lastTime = time;
        if (countdown) {
          this.total -= delta;
        } else {
          this.total += delta;
        }
        if (stopAt !== null && ((countdown && this.total <= stopAt) || (!countdown && this.total >= stopAt))) {
          this.total = stopAt;
          this.finished = true;
          this.stop();
          this.fire('runnerFinish');
        }
        this.value(this.total);
        this.updating = false;
      }
    };

    Runner.prototype.fire = function(event) {
      this.items.trigger(event, this.info());
    };

    Runner.prototype.start = function() {
      var step;
      if (!this.running) {
        this.running = true;
        if (!this.startTime || this.finished) {
          this.reset();
        }
        this.lastTime = _$.now();
        step = (function(_this) {
          return function() {
            if (_this.running) {
              _this.update();
              _requestAnimationFrame(step);
            }
          };
        })(this);
        _requestAnimationFrame(step);
        this.fire('runnerStart');
      }
    };

    Runner.prototype.stop = function() {
      if (this.running) {
        this.running = false;
        this.update();
        this.fire('runnerStop');
      }
    };

    Runner.prototype.toggle = function() {
      if (this.running) {
        this.stop();
      } else {
        this.start();
      }
    };

    Runner.prototype.lap = function() {
      var lap, last;
      last = this.lastTime;
      lap = last - this.lapTime;
      if (this.settings.countdown) {
        lap = -lap;
      }
      if (this.running || lap) {
        this.lastLap = lap;
        this.lapTime = last;
      }
      last = this.format(this.lastLap);
      this.fire('runnerLap');
      return last;
    };

    Runner.prototype.reset = function(stop) {
      var nowTime;
      if (stop) {
        this.stop();
      }
      nowTime = _$.now();
      if (typeof this.settings.startAt === 'number' && !this.settings.countdown) {
        nowTime -= this.settings.startAt;
      }
      this.startTime = this.lapTime = this.lastTime = nowTime;
      this.total = this.settings.startAt;
      this.value(this.total);
      this.finished = false;
      this.fire('runnerReset');
    };

    Runner.prototype.info = function() {
      var lap;
      lap = this.lastLap || 0;
      return {
        running: this.running,
        finished: this.finished,
        time: this.total,
        formattedTime: this.format(this.total),
        startTime: this.startTime,
        lapTime: lap,
        formattedLapTime: this.format(lap),
        settings: this.settings
      };
    };

    return Runner;

  })();

  _$.fn.runner = function(method, options, start) {
    var id, runner;
    if (!method) {
      method = 'init';
    }
    if (typeof method === 'object') {
      start = options;
      options = method;
      method = 'init';
    }
    id = this.data('runner');
    runner = id ? runners[id] : false;
    switch (method) {
      case 'init':
        new Runner(this, options, start);
        break;
      case 'info':
        if (runner) {
          return runner.info();
        }
        break;
      case 'reset':
        if (runner) {
          runner.reset(options);
        }
        break;
      case 'lap':
        if (runner) {
          return runner.lap();
        }
        break;
      case 'start':
      case 'stop':
      case 'toggle':
        if (runner) {
          return runner[method]();
        }
        break;
      case 'version':
        return meta.version;
      default:
        _$.error('[' + meta.name + '] Method ' + method + ' does not exist');
    }
    return this;
  };

  _$.fn.runner.format = formatTime;

}).call(this);

;(function (window, navigator, $, undefined) {
    "use strict";

    window.ion = window.ion || {};

    if (ion.sound) {
        return;
    }

    var warn = function (text) {
        if (!text) text = "undefined";

        if (window.console) {
            if (console.warn && typeof console.warn === "function") {
                console.warn(text);
            } else if (console.log && typeof console.log === "function") {
                console.log(text);
            }

            var d = $ && $("#debug");
            if (d && d.length) {
                var a = d.html();
                d.html(a + text + '<br/>');
            }
        }
    };

    var extend = function (parent, child) {
        var prop;
        child = child || {};

        for (prop in parent) {
            if (parent.hasOwnProperty(prop)) {
                child[prop] = parent[prop];
            }
        }

        return child;
    };



    /**
     * DISABLE for unsupported browsers
     */

    if (typeof Audio !== "function" && typeof Audio !== "object") {
        var func = function () {
            warn("HTML5 Audio is not supported in this browser");
        };
        ion.sound = func;
        ion.sound.play = func;
        ion.sound.stop = func;
        ion.sound.pause = func;
        ion.sound.preload = func;
        ion.sound.destroy = func;
        func();
        return;
    }



    /**
     * CORE
     * - creating sounds collection
     * - public methods
     */

    var is_iOS = /iPad|iPhone|iPod/.test(navigator.appVersion),
        sounds_num = 0,
        settings = {},
        sounds = {},
        i;



    if (!settings.supported && is_iOS) {
        settings.supported = ["mp3", "mp4", "aac"];
    } else if (!settings.supported) {
        settings.supported = ["mp3", "ogg", "mp4", "aac", "wav"];
    }

    var createSound = function (obj) {
        var name = obj.alias || obj.name;

        if (!sounds[name]) {
            sounds[name] = new Sound(obj);
            sounds[name].init();
        }
    };

    ion.sound = function (options) {
        extend(options, settings);

        settings.path = settings.path || "";
        settings.volume = settings.volume || 1;
        settings.preload = settings.preload || false;
        settings.multiplay = settings.multiplay || false;
        settings.loop = settings.loop || false;
        settings.sprite = settings.sprite || null;
        settings.scope = settings.scope || null;
        settings.ready_callback = settings.ready_callback || null;
        settings.ended_callback = settings.ended_callback || null;

        sounds_num = settings.sounds.length;

        if (!sounds_num) {
            warn("No sound-files provided!");
            return;
        }

        for (i = 0; i < sounds_num; i++) {
            createSound(settings.sounds[i]);
        }
    };

    ion.sound.VERSION = "3.0.6";

    ion.sound._method = function (method, name, options) {
        if (name) {
            sounds[name] && sounds[name][method](options);
        } else {
            for (i in sounds) {
                if (!sounds.hasOwnProperty(i) || !sounds[i]) {
                    continue;
                }

                sounds[i][method](options);
            }
        }
    };

    ion.sound.preload = function (name, options) {
        options = options || {};
        extend({preload: true}, options);

        ion.sound._method("init", name, options);
    };

    ion.sound.destroy = function (name) {
        ion.sound._method("destroy", name);

        if (name) {
            sounds[name] = null;
        } else {
            for (i in sounds) {
                if (!sounds.hasOwnProperty(i)) {
                    continue;
                }
                if (sounds[i]) {
                    sounds[i] = null;
                }
            }
        }
    };

    ion.sound.play = function (name, options) {
        ion.sound._method("play", name, options);
    };

    ion.sound.stop = function (name, options) {
        ion.sound._method("stop", name, options);
    };

    ion.sound.pause = function (name, options) {
        ion.sound._method("pause", name, options);
    };

    ion.sound.volume = function (name, options) {
        ion.sound._method("volume", name, options);
    };

    if ($) {
        $.ionSound = ion.sound;
    }



    /**
     * Web Audio API core
     * - for most advanced browsers
     */

    var AudioContext = window.AudioContext || window.webkitAudioContext,
        audio;

    if (AudioContext) {
        audio = new AudioContext();
    }


    var Sound = function (options) {
        this.options = extend(settings);
        delete this.options.sounds;
        extend(options, this.options);

        this.request = null;
        this.streams = {};
        this.result = {};
        this.ext = 0;
        this.url = "";

        this.loaded = false;
        this.decoded = false;
        this.no_file = false;
        this.autoplay = false;
    };

    Sound.prototype = {
        init: function (options) {
            if (options) {
                extend(options, this.options);
            }

            if (this.options.preload) {
                this.load();
            }
        },

        destroy: function () {
            var stream;

            for (i in this.streams) {
                stream = this.streams[i];

                if (stream) {
                    stream.destroy();
                    stream = null;
                }
            }
            this.streams = {};
            this.result = null;
            this.options.buffer = null;
            this.options = null;

            if (this.request) {
                this.request.removeEventListener("load", this.ready.bind(this), false);
                this.request.removeEventListener("error", this.error.bind(this), false);
                this.request.abort();
                this.request = null;
            }
        },

        createUrl: function () {
            var no_cache = new Date().valueOf();
            this.url = this.options.path + encodeURIComponent(this.options.name) + "." + this.options.supported[this.ext] + "?" + no_cache;
        },

        load: function () {
            if (this.no_file) {
                warn("No sources for \"" + this.options.name + "\" sound :(");
                return;
            }

            this.createUrl();

            this.request = new XMLHttpRequest();
            this.request.open("GET", this.url, true);
            this.request.responseType = "arraybuffer";
            this.request.addEventListener("load", this.ready.bind(this), false);
            this.request.addEventListener("error", this.error.bind(this), false);

            this.request.send();
        },

        reload: function () {
            this.ext++;

            if (this.options.supported[this.ext]) {
                this.load();
            } else {
                this.no_file = true;
                warn("No sources for \"" + this.options.name + "\" sound :(");
            }
        },

        ready: function (data) {
            this.result = data.target;

            if (this.result.readyState !== 4) {
                this.reload();
                return;
            }

            if (this.result.status !== 200 && this.result.status !== 0) {
                warn(this.url + " was not found on server!");
                this.reload();
                return;
            }

            this.request.removeEventListener("load", this.ready.bind(this), false);
            this.request.removeEventListener("error", this.error.bind(this), false);
            this.request = null;
            this.loaded = true;
            //warn("Loaded: " + this.options.name + "." + settings.supported[this.ext]);

            this.decode();
        },

        decode: function () {
            if (!audio) {
                return;
            }

            audio.decodeAudioData(this.result.response, this.setBuffer.bind(this), this.error.bind(this));
        },

        setBuffer: function (buffer) {
            this.options.buffer = buffer;
            this.decoded = true;
            //warn("Decoded: " + this.options.name + "." + settings.supported[this.ext]);

            var config = {
                name: this.options.name,
                alias: this.options.alias,
                ext: this.options.supported[this.ext],
                duration: this.options.buffer.duration
            };

            if (this.options.ready_callback && typeof this.options.ready_callback === "function") {
                this.options.ready_callback.call(this.options.scope, config);
            }

            if (this.options.sprite) {

                for (i in this.options.sprite) {
                    this.options.start = this.options.sprite[i][0];
                    this.options.end = this.options.sprite[i][1];
                    this.streams[i] = new Stream(this.options, i);
                }

            } else {

                this.streams[0] = new Stream(this.options);

            }

            if (this.autoplay) {
                this.autoplay = false;
                this.play();
            }
        },

        error: function () {
            this.reload();
        },

        play: function (options) {
            delete this.options.part;

            if (options) {
                extend(options, this.options);
            }

            if (!this.loaded) {
                if (!this.options.preload) {
                    this.autoplay = true;
                    this.load();
                }
                return;
            }

            if (this.no_file || !this.decoded) {
                return;
            }

            if (this.options.sprite) {
                if (this.options.part) {
                    this.streams[this.options.part].play(this.options);
                } else {
                    for (i in this.options.sprite) {
                        this.streams[i].play(this.options);
                    }
                }
            } else {
                this.streams[0].play(this.options);
            }
        },

        stop: function (options) {
            if (this.options.sprite) {

                if (options) {
                    this.streams[options.part].stop();
                } else {
                    for (i in this.options.sprite) {
                        this.streams[i].stop();
                    }
                }

            } else {
                this.streams[0].stop();
            }
        },

        pause: function (options) {
            if (this.options.sprite) {

                if (options) {
                    this.streams[options.part].pause();
                } else {
                    for (i in this.options.sprite) {
                        this.streams[i].pause();
                    }
                }

            } else {
                this.streams[0].pause();
            }
        },

        volume: function (options) {
            var stream;

            if (options) {
                extend(options, this.options);
            } else {
                return;
            }

            if (this.options.sprite) {
                if (this.options.part) {
                    stream = this.streams[this.options.part];
                    stream && stream.setVolume(this.options);
                } else {
                    for (i in this.options.sprite) {
                        stream = this.streams[i];
                        stream && stream.setVolume(this.options);
                    }
                }
            } else {
                stream = this.streams[0];
                stream && stream.setVolume(this.options);
            }
        }
    };



    var Stream = function (options, sprite_part) {
        this.alias = options.alias;
        this.name = options.name;
        this.sprite_part = sprite_part;

        this.buffer = options.buffer;
        this.start = options.start || 0;
        this.end = options.end || this.buffer.duration;
        this.multiplay = options.multiplay || false;
        this.volume = options.volume || 1;
        this.scope = options.scope;
        this.ended_callback = options.ended_callback;

        this.setLoop(options);

        this.source = null;
        this.gain = null;
        this.playing = false;
        this.paused = false;

        this.time_started = 0;
        this.time_ended = 0;
        this.time_played = 0;
        this.time_offset = 0;
    };

    Stream.prototype = {
        destroy: function () {
            this.stop();

            this.buffer = null;
            this.source = null;

            this.gain && this.gain.disconnect();
            this.source && this.source.disconnect();
            this.gain = null;
            this.source = null;
        },

        setLoop: function (options) {
            if (options.loop === true) {
                this.loop = 9999999;
            } else if (typeof options.loop === "number") {
                this.loop = +options.loop - 1;
            } else {
                this.loop = false;
            }
        },

        update: function (options) {
            this.setLoop(options);
            if ("volume" in options) {
                this.volume = options.volume;
            }
        },

        play: function (options) {
            if (options) {
                this.update(options);
            }

            if (!this.multiplay && this.playing) {
                return;
            }

            this.gain = audio.createGain();
            this.source = audio.createBufferSource();
            this.source.buffer = this.buffer;
            this.source.connect(this.gain);
            this.gain.connect(audio.destination);
            this.gain.gain.value = this.volume;

            this.source.onended = this.ended.bind(this);

            this._play();
        },

        _play: function () {
            var start,
                end;

            if (this.paused) {
                start = this.start + this.time_offset;
                end = this.end - this.time_offset;
            } else {
                start = this.start;
                end = this.end;
            }

            if (end <= 0) {
                this.clear();
                return;
            }

            if (typeof this.source.start === "function") {
                this.source.start(0, start, end);
            } else {
                this.source.noteOn(0, start, end);
            }

            this.playing = true;
            this.paused = false;
            this.time_started = new Date().valueOf();
        },

        stop: function () {
            if (this.playing && this.source) {
                if (typeof this.source.stop === "function") {
                    this.source.stop(0);
                } else {
                    this.source.noteOff(0);
                }
            }

            this.clear();
        },

        pause: function () {
            if (this.paused) {
                this.play();
                return;
            }

            if (!this.playing) {
                return;
            }

            this.source && this.source.stop(0);
            this.paused = true;
        },

        ended: function () {
            this.playing = false;
            this.time_ended = new Date().valueOf();
            this.time_played = (this.time_ended - this.time_started) / 1000;
            this.time_offset += this.time_played;

            if (this.time_offset >= this.end || this.end - this.time_offset < 0.015) {
                this._ended();
                this.clear();

                if (this.loop) {
                    this.loop--;
                    this.play();
                }
            }
        },

        _ended: function () {
            var config = {
                name: this.name,
                alias: this.alias,
                part: this.sprite_part,
                start: this.start,
                duration: this.end
            };

            if (this.ended_callback && typeof this.ended_callback === "function") {
                this.ended_callback.call(this.scope, config);
            }
        },

        clear: function () {
            this.time_played = 0;
            this.time_offset = 0;
            this.paused = false;
            this.playing = false;
        },

        setVolume: function (options) {
            this.volume = options.volume;

            if (this.gain) {
                this.gain.gain.value = this.volume;
            }
        }
    };

    if (audio) {
        return;
    }



    /**
     * Fallback for HTML5 audio
     * - for not so modern browsers
     */

    var checkSupport = function () {
        var sound = new Audio(),
            can_play_mp3 = sound.canPlayType('audio/mpeg'),
            can_play_ogg = sound.canPlayType('audio/ogg'),
            can_play_aac = sound.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
            item, i;

        for (i = 0; i < settings.supported.length; i++) {
            item = settings.supported[i];

            if (!can_play_mp3 && item === "mp3") {
                settings.supported.splice(i, 1);
            }

            if (!can_play_ogg && item === "ogg") {
                settings.supported.splice(i, 1);
            }

            if (!can_play_aac && item === "aac") {
                settings.supported.splice(i, 1);
            }

            if (!can_play_aac && item === "mp4") {
                settings.supported.splice(i, 1);
            }
        }

        sound = null;
    };
    checkSupport();



    Sound.prototype = {
        init: function (options) {
            if (options) {
                extend(options, this.options);
            }

            this.inited = true;

            if (this.options.preload) {
                this.load();
            }
        },

        destroy: function () {
            var stream;

            for (i in this.streams) {
                stream = this.streams[i];

                if (stream) {
                    stream.destroy();
                    stream = null;
                }
            }
            this.streams = {};
            this.loaded = false;
            this.inited = false;
        },

        load: function () {
            var part;

            this.options.preload = true;
            this.options._ready = this.ready;
            this.options._scope = this;

            if (this.options.sprite) {

                for (i in this.options.sprite) {
                    part = this.options.sprite[i];

                    this.options.start = part[0];
                    this.options.end = part[1];

                    this.streams[i] = new Stream(this.options, i);
                }

            } else {

                this.streams[0] = new Stream(this.options);

            }
        },

        ready: function (duration) {
            if (this.loaded) {
                return;
            }

            this.loaded = true;

            var config = {
                name: this.options.name,
                alias: this.options.alias,
                ext: this.options.supported[this.ext],
                duration: duration
            };

            if (this.options.ready_callback && typeof this.options.ready_callback === "function") {
                this.options.ready_callback.call(this.options.scope, config);
            }

            if (this.autoplay) {
                this.autoplay = false;
                this.play();
            }
        },

        play: function (options) {
            if (!this.inited) {
                return;
            }

            delete this.options.part;

            if (options) {
                extend(options, this.options);
            }

            if (!this.loaded) {
                if (!this.options.preload) {
                    this.autoplay = true;
                    this.load();
                }
                return;
            }

            if (this.options.sprite) {
                if (this.options.part) {
                    this.streams[this.options.part].play(this.options);
                } else {
                    for (i in this.options.sprite) {
                        this.streams[i].play(this.options);
                    }
                }
            } else {
                this.streams[0].play(this.options);
            }
        },

        stop: function (options) {
            if (!this.inited) {
                return;
            }

            if (this.options.sprite) {

                if (options) {
                    this.streams[options.part].stop();
                } else {
                    for (i in this.options.sprite) {
                        this.streams[i].stop();
                    }
                }

            } else {
                this.streams[0].stop();
            }
        },

        pause: function (options) {
            if (!this.inited) {
                return;
            }

            if (this.options.sprite) {

                if (options) {
                    this.streams[options.part].pause();
                } else {
                    for (i in this.options.sprite) {
                        this.streams[i].pause();
                    }
                }

            } else {
                this.streams[0].pause();
            }
        },

        volume: function (options) {
            var stream;

            if (options) {
                extend(options, this.options);
            } else {
                return;
            }

            if (this.options.sprite) {
                if (this.options.part) {
                    stream = this.streams[this.options.part];
                    stream && stream.setVolume(this.options);
                } else {
                    for (i in this.options.sprite) {
                        stream = this.streams[i];
                        stream && stream.setVolume(this.options);
                    }
                }
            } else {
                stream = this.streams[0];
                stream && stream.setVolume(this.options);
            }
        }
    };



    Stream = function (options, sprite_part) {
        this.name = options.name;
        this.alias = options.alias;
        this.sprite_part = sprite_part;

        this.multiplay = options.multiplay;
        this.volume = options.volume;
        this.preload = options.preload;
        this.path = settings.path;
        this.start = options.start || 0;
        this.end = options.end || 0;
        this.scope = options.scope;
        this.ended_callback = options.ended_callback;

        this._scope = options._scope;
        this._ready = options._ready;

        this.setLoop(options);

        this.sound = null;
        this.url = null;
        this.loaded = false;

        this.start_time = 0;
        this.paused_time = 0;
        this.played_time = 0;

        this.init();
    };

    Stream.prototype = {
        init: function () {
            this.sound = new Audio();
            this.sound.volume = this.volume;

            this.createUrl();

            this.sound.addEventListener("ended", this.ended.bind(this), false);
            this.sound.addEventListener("canplaythrough", this.can_play_through.bind(this), false);
            this.sound.addEventListener("timeupdate", this._update.bind(this), false);

            this.load();
        },

        destroy: function () {
            this.stop();

            this.sound.removeEventListener("ended", this.ended.bind(this), false);
            this.sound.removeEventListener("canplaythrough", this.can_play_through.bind(this), false);
            this.sound.removeEventListener("timeupdate", this._update.bind(this), false);

            this.sound = null;
            this.loaded = false;
        },

        createUrl: function () {
            var rand = new Date().valueOf();
            this.url = this.path + encodeURIComponent(this.name) + "." + settings.supported[0] + "?" + rand;
        },

        can_play_through: function () {
            if (this.preload) {
                this.ready();
            }
        },

        load: function () {
            this.sound.src = this.url;
            this.sound.preload = this.preload ? "auto" : "none";
            if (this.preload) {
                this.sound.load();
            }
        },

        setLoop: function (options) {
            if (options.loop === true) {
                this.loop = 9999999;
            } else if (typeof options.loop === "number") {
                this.loop = +options.loop - 1;
            } else {
                this.loop = false;
            }
        },

        update: function (options) {
            this.setLoop(options);

            if ("volume" in options) {
                this.volume = options.volume;
            }
        },

        ready: function () {
            if (this.loaded || !this.sound) {
                return;
            }

            this.loaded = true;
            this._ready.call(this._scope, this.sound.duration);

            if (!this.end) {
                this.end = this.sound.duration;
            }
        },

        play: function (options) {
            if (options) {
                this.update(options);
            }

            if (!this.multiplay && this.playing) {
                return;
            }

            this._play();
        },

        _play: function () {
            if (this.paused) {
                this.paused = false;
            } else {
                try {
                    this.sound.currentTime = this.start;
                } catch (e) {}
            }

            this.playing = true;
            this.start_time = new Date().valueOf();
            this.sound.volume = this.volume;
            this.sound.play();
        },

        stop: function () {
            if (!this.playing) {
                return;
            }

            this.playing = false;
            this.paused = false;
            this.sound.pause();
            this.clear();

            try {
                this.sound.currentTime = this.start;
            } catch (e) {}
        },

        pause: function () {
            if (this.paused) {
                this._play();
            } else {
                this.playing = false;
                this.paused = true;
                this.sound.pause();
                this.paused_time = new Date().valueOf();
                this.played_time += this.paused_time - this.start_time;
            }
        },

        _update: function () {
            if (!this.start_time) {
                return;
            }

            var current_time = new Date().valueOf(),
                played_time = current_time - this.start_time,
                played = (this.played_time + played_time) / 1000;

            if (played >= this.end) {
                if (this.playing) {
                    this.stop();
                    this._ended();
                }
            }
        },

        ended: function () {
            if (this.playing) {
                this.stop();
                this._ended();
            }
        },

        _ended: function () {
            this.playing = false;

            var config = {
                name: this.name,
                alias: this.alias,
                part: this.sprite_part,
                start: this.start,
                duration: this.end
            };

            if (this.ended_callback && typeof this.ended_callback === "function") {
                this.ended_callback.call(this.scope, config);
            }

            if (this.loop) {
                setTimeout(this.looper.bind(this), 15);
            }
        },

        looper: function () {
            this.loop--;
            this.play();
        },

        clear: function () {
            this.start_time = 0;
            this.played_time = 0;
            this.paused_time = 0;
        },

        setVolume: function (options) {
            this.volume = options.volume;

            if (this.sound) {
                this.sound.volume = this.volume;
            }
        }
    };

} (window, navigator, window.jQuery || window.$));

(function ($) {
	/**
	 * @param {*|HTMLElement} target
	 * @param {Object} opts
	 * @constructor
	 */
	var WorkoutTimer = function(target, opts) {

		/**
		 * The DOM element associated with this timer
		 * @type {*|HTMLElement}
		 */
		this.domElement = $(target);

		/**
		 *
		 * @type {Object}
		 */
		this.options = opts;

		/**
		 * Holds the original number of repetitions in case the timer is reset
		 * @type {number|Number|*}
		 */
		this.options.originalRepetitions = this.options.repetitions;

		WorkoutTimer.instances.push(this);

		this.setOptionsFromDataAttributes();

		/**
		 * The field that displays the current time in this timer
		 * @type {*|HTMLElement}
		 */
		this.counter = this.domElement.find( '[data-counter]' ) || null;
		this.counter.attr('data-state', 'base');

		if ( this.options.sound ) {
			this.options.volume = WorkoutTimer.volumeStates[0].level;
		}

		this.initRunner();

		this.initControls();
		this.updateRepetitionCounter();

		this.updateVolumeCounter();
	};

	/**
	 * Default plugin options
	 * @type {{countdown: boolean, duration: number, duration2: number, repetitions: number, controls: {counter: string, playPause: string, repetitionCounter: string, volume: string}}}
	 */
	WorkoutTimer.defaults = {
		countdown: false,
		autostart: false,
		duration: 10,
		duration2: 0,
		repetitions: 0,
		sound: null,
		onPlay: function() {},
		onPause: function() {},
		onRestart: function() {},
		onRoundComplete: function() {},
		onComplete: function() {}
	};

	/**
	 * Stores a list of all known WorkoutTimer instances
	 * @type {Array}
	 */
	WorkoutTimer.instances = [];

	/**
	 * Available volume states. This property is shared among all instances of WorkoutTimer.
	 * @static
	 * @type {Object[]}
	 */
	WorkoutTimer.volumeStates = [
		{ name: 'level1', level: 0.5 },
		{ name: 'level2', level: 1 },
		{ name: 'level3', level: 2 },
		{ name: 'mute', level: 0 }
	];

	/**
	 * An enum of events thrown by this plugin
	 * @enum
	 * @type {{START: string, PAUSE: string, RESTART: string, COMPLETE: string}}
	 */
	WorkoutTimer.events = {
		START: 'start',
		PAUSE: 'pause',
		RESTART: 'restart',
		ROUND_COMPLETE: 'roundComplete',
		COMPLETE: 'complete'
	};

	/**
	 * Advances to the next volume level (1 -> 2 -> 3 -> mute). Affects all instances of WorkoutTimer.
	 * @static
	 */
	WorkoutTimer.toggleVolume = function() {
		WorkoutTimer.volumeStates.push( WorkoutTimer.volumeStates.shift() );

		for ( var i = 0; i < WorkoutTimer.instances.length; i++ ) {
			var nextInstance = WorkoutTimer.instances[i];
			nextInstance.options.volume = WorkoutTimer.volumeStates[0].level;
			nextInstance.updateVolumeCounter();
		}
	};

	/**
	 * Default sound options
	 * @type {{path: string, preload: boolean}}
	 */
	WorkoutTimer.soundDefaults = {
		path: 'audio/',
		preload: true
	};

	/**
	 * Registers a sound to be used with the plugin. To specify a sound, register it using $.WorkoutTimer.registerSound()
	 * and then set the data-sound attribute of your timer (or pass the sound name in as a configuration variable).
	 * @param soundObj
	 * @static
	 */
	WorkoutTimer.registerSound = function(opts) {
		var soundOptions = $.extend( {}, WorkoutTimer.soundDefaults, opts );

		soundOptions.volume = WorkoutTimer.volumeStates[0].level;

		if ( soundOptions.name ) {
			soundOptions.sounds = [{
				name: soundOptions.name
			}];
		}

		ion.sound(soundOptions);
	};

	/**
	 * Overrides the passed in configuration options by attempting to parse properties from data-attributes
	 * attached to the DOM element
	 */
	WorkoutTimer.prototype.setOptionsFromDataAttributes = function() {
		var dataAttributes = this.domElement.data();

		if (dataAttributes.autostart) {
			this.options.autostart = dataAttributes.autostart;
		}

		if (dataAttributes.countdown) {
			this.options.countdown = dataAttributes.countdown;
		}

		if (dataAttributes.duration) {
			this.options.duration = parseFloat(dataAttributes.duration);
		}

		if (dataAttributes.duration2) {
			this.options.duration2 = parseFloat(dataAttributes.duration2);
		}

		if (dataAttributes.repetitions) {
			this.options.repetitions = parseFloat(dataAttributes.repetitions);
			this.options.originalRepetitions = this.options.repetitions;
		}

		if (dataAttributes.sound) {
			this.options.sound = dataAttributes.sound;
		}
	};

	/**
	 * Sets up the jQuery.runner to carry out the next interval
	 * @param {Number} duration The next duration to count to
	 * @param {Boolean} [autostart=false] Starts the timer regardless of whether options.autostart is true
	 */
	WorkoutTimer.prototype.initRunner = function(duration, autostart) {
		var instance = this;

		if (!duration) {
			duration = this.options.duration;
		}

		var runnerOpts = {
			autostart: this.options.autostart || autostart,
			countdown: this.options.countdown,
			startAt: this.options.countdown ? duration * 1000 : 0
		};

		// A value of -1 for repetitions means this counter will run indefinitely
		if (this.options.repetitions >= 0) {
			if (this.options.countdown) {
				runnerOpts.stopAt = 0;
			} else {
				runnerOpts.stopAt = duration * 1000;
			}
		}

		this.counter.runner(runnerOpts);

		// Since the runner is recycled, make sure the finish listener is only bound once
		this.counter.off('runnerFinish').on('runnerFinish', function() {
			instance.intervalComplete();
		});
	};

	WorkoutTimer.prototype.initControls = function() {
		var instance = this;
		this.controls = this.controls || {};

		this.controls.playPause = this.domElement.find( '[data-control=play-pause]' ) || null;
		this.controls.reset = this.domElement.find( '[data-control=reset]' ) || null;
		this.controls.repetitionCounter = this.domElement.find( '[data-repetitions]' ) || null;
		this.controls.volume = this.domElement.find( '[data-control=volume]' ) || null;

		this.controls.playPause.on('click', function() {
			instance.toggleRunnerState();
		});

		this.resetPlayPauseControl();

		this.controls.reset.on('click', function() {
			instance.counter.runner('reset', true);
			instance.resetPlayPauseControl();
			instance.resetRepetitions();
		});

		this.controls.volume.on('click', function() {
			WorkoutTimer.toggleVolume();
		});
	};

	WorkoutTimer.prototype.resetPlayPauseControl = function() {
		// TODO: Move this somewhere more appropriate
		if (this.options.autostart) {
			this.controls.playPause.attr('data-paused', 'false');
		} else {
			this.controls.playPause.attr('data-paused', 'true');
		}
	};

	/**
	 * Toggles between playing and paused states
	 */
	WorkoutTimer.prototype.toggleRunnerState = function() {
		this.counter.runner('toggle');

		if ( this.controls.playPause.attr('data-paused') === 'true') {
			this.controls.playPause.attr('data-paused', 'false');
			if (this.options.onStart && typeof(this.options.onStart) === 'function') {
				this.options.onStart(WorkoutTimer.events.START, this.domElement.eq(0), this);
			}
		} else {
			this.controls.playPause.attr('data-paused', 'true');
			if (this.options.onPause && typeof(this.options.onPause) === 'function') {
				this.options.onPause(WorkoutTimer.events.PAUSE, this.domElement.eq(0), this);
			}
		}
	};

	/**
	 * Updates the number of repetitions remaining counter
	 */
	WorkoutTimer.prototype.updateRepetitionCounter = function() {
		this.controls.repetitionCounter.html( this.options.repetitions >= 0 ? this.options.repetitions : '&infin;' );
	};

	/**
	 * Resets the timer back to the original number of repetitions
	 */
	WorkoutTimer.prototype.resetRepetitions = function() {
		this.options.repetitions = this.options.originalRepetitions;
		this.updateRepetitionCounter();

		if (this.options.onRestart && typeof(this.options.onRestart) === 'function') {
			this.options.onRestart(WorkoutTimer.events.RESTART, this.domElement.eq(0), this);
		}
	};

	/**
	 *
	 */
	WorkoutTimer.prototype.intervalComplete = function() {
		// Play sound if configured
		if ( this.options.sound ) {
			ion.sound.play( this.options.sound, { volume: this.options.volume } );
		}

		if (this.options.onRoundComplete && typeof(this.options.onRoundComplete) === 'function') {
			this.options.onRoundComplete(WorkoutTimer.events.ROUND_COMPLETE, this.domElement.eq(0), this);
		}

		if (this.options.repetitions > 0) {
			var duration = this.options.duration;

			// If this timer contains two duration properties, swap between the base and the alternate
			if (this.options.duration2) {
				if ( this.domElement.data('currentCounter') === 'alternate' ) {
					duration = this.options.duration;
					this.domElement.data('currentCounter', 'base');
					this.counter.attr('data-state', 'base');

					// For a double-interval counter, only decrement the repetitions counter when the second interval finishes
					this.options.repetitions--;
				} else {
					duration = this.options.duration2;
					this.domElement.data('currentCounter', 'alternate');
					this.counter.attr('data-state', 'alternate');
				}
			} else {
				this.domElement.data('currentCounter', 'base');
				this.counter.attr('data-state', 'base');
				this.options.repetitions--;
			}

			this.updateRepetitionCounter();
			this.initRunner(duration, true);
		} else {
			this.timerComplete();
		}
	};

	/**
	 * Handler for the end of the timer
	 */
	WorkoutTimer.prototype.timerComplete = function() {
		this.counter.attr('data-state', 'complete');

		if (this.options.onComplete && typeof(this.options.onComplete) === 'function') {
			this.options.onComplete(WorkoutTimer.events.COMPLETE, this.domElement.eq(0), this);
		}
	};

	/**
	 * Updates the current state of the volume counter
	 */
	WorkoutTimer.prototype.updateVolumeCounter = function() {
		var vol = WorkoutTimer.volumeStates[0];
		this.volume = vol.level;
		this.controls.volume.attr('data-volume-level', vol.name);
	};

	$.WorkoutTimer = WorkoutTimer;

	$.fn.workoutTimer = function (opts) {
		return this.each(function () {
			var options = $.extend({}, WorkoutTimer.defaults, opts);
			new WorkoutTimer(this, options);
		});
	};
}(jQuery));
