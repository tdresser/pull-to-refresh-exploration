"use strict";

// Time in in ms, velocity out in pixels per second.
function VelocityCalculator(bufferSize) {
  var data = [];

  this.reset = function() {
    data = [];
  };

  // We do this frequently, so keep it light. Delay as much computation as
  // possible until |getVelocity| is called.
  this.addValue = function(y, ms) {
    data.push([ms, y]);
    while (data.length > bufferSize ||
        (data.length > 1 && ms - data[0][0] > 100)) {
      data.shift();
    }
  };

  this.getVelocity = function(ms) {
    if (data.length < 2) {
      return 0;
    }

    var usable_data = [];
    var newestTime = data[data.length - 1][0];
    var newestPosition = data[data.length - 1][1];
    for (var i = 0; i < data.length; ++i) {
      usable_data.push([newestTime - data[i][0], newestPosition - data[i][1]]);
      console.log("Position\t", newestPosition - data[i][1]);
      console.log("Time\t", newestTime - data[i][0]);
    }

    var regression_result = window.regression('polynomial', usable_data);
    // Return velocity at last point.
    var result = -2 * usable_data[usable_data.length - 1][0] *
        regression_result.equation[2] +
        regression_result.equation[1] * 1000;

    if (isNaN(result)) {
      return 0;
    }
    return result;
  }
};
