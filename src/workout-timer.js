/*
 * jQuery Workout Timer 1.0
 * Copyright (c) 2015 Hanson Inc.
 * Licensed under the MIT license.
 *
 * @constructor
 * @alias $.fn.workoutTimer
 * @classdesc A multi-functional workout timer based on jQuery.runner
 * @requires jquery
 * @requires jquery.runner
 * @requires ion.sound
 */
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
