(function ($) {
  module('jQuery#jqueryWorkoutTimer', {
    setup: function () {
      this.elems = $('#qunit-fixture').children();
    }
  });

  test('is chainable', function () {
    expect(1);
    strictEqual(this.elems.jqueryWorkoutTimer(), this.elems, 'should be chainable');
  });

  test('is jqueryWorkoutTimer', function () {
    expect(1);
    strictEqual(this.elems.jqueryWorkoutTimer().text(), 'jqueryWorkoutTimer0jqueryWorkoutTimer1jqueryWorkoutTimer2', 'should be jqueryWorkoutTimer');
  });

}(jQuery));
