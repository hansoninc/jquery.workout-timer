/*
 * jQuery Workout Timer 1.0
 * Copyright (c) 2015 Dave Rodriguez
 * Licensed under the MIT license.
 */
(function ($) {
	/**
	 *
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

		// Parse options from data-attributes
		this.setOptionsFromDataAttributes();

		this.counter = this.domElement.find( this.options.controls.counter ) || null;

		this.initRunner();

		this.initControls();
	};

	/**
	 * Default plugin options
	 * @type {{countdown: boolean, duration: number, duration2: number, intervals: number, controls: {counter: string, playPause: string, intervalCounter: string, volume: string}}}
	 */
	WorkoutTimer.defaults = {
		countdown: false,
		autostart: false,
		duration: 10,
		duration2: 0,
		intervals: 1,
		controls: {
			counter: '.workout-timer__counter',
			playPause: '.workout-timer__play-pause',
			intervalCounter: '.workout-timer__intervals',
			volume: '.workout-timer__volume'
		}
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
			this.options.duration = parseFloat(dataAttributes.duration);
		}

		if (dataAttributes.intervals) {
			this.options.intervals = parseFloat(dataAttributes.intervals);
		}
	};

	WorkoutTimer.prototype.initRunner = function() {

		var runnerOpts = {
			autostart: this.options.autostart,
			countdown: this.options.countdown,
			startAt: this.options.countdown ? this.options.duration * 1000 : 0
		};

		// A value of 0 or less for intervals means this counter will run indefinitely
		if (this.options.intervals > 0) {
			if (this.options.countdown) {
				runnerOpts.stopAt = 0;
			} else {
				runnerOpts.stopAt = this.options.duration * 1000;
			}
		}

		this.counter.runner(runnerOpts);
	};

	WorkoutTimer.prototype.initControls = function() {

		var instance = this;

		this.controls = this.controls || {};

		this.controls.playPause = this.domElement.find( this.options.controls.playPause ) || null;
		this.controls.intervalCounter = this.domElement.find( this.options.controls.intervalCounter ) || null;
		this.controls.volume = this.domElement.find( this.options.controls.volume ) || null;

		this.controls.playPause.on('click', function() {
			instance.counter.runner('start');
		});
	};

	$.fn.workoutTimer = function (opts) {

		return this.each(function () {
			var options = $.extend({}, WorkoutTimer.defaults, opts);
			new WorkoutTimer(this, options);
		});
	};
}(jQuery));
