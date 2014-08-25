function OverscrollHandler(scroller, listener, onPositionUpdate) {
  var self = this;
  var scrollPosition = 0;
  var touchPosition = 0;
  var flingCurve = null;
  var velocityCalculator = new VelocityCalculator(20);

  var touchBase = 0;
  var seenTouchMove = false;

  // Since we're using RAF timestamps, we sometimes need store some information
  // to pass to the RAF callback.
  var pendingPositions = [];
  var pendingTimeStamps = [];
  var pendingFling = false;
  var lastRafTimestamp = 0;
  var touchCount = 0;

  this.onFlingIn = null;

  function reset_touch_move_base(y) {
    touchBase = -scroller.scrollTop - y;
    // If we're starting while overscrolled, offset by the current overscroll amount.
    if (scroller.scrollTop === 0 && touchPosition < 0) {
      touchBase -= touchPosition;
    }
  }

  listener.addEventListener("touchstart", function(e){
    touchCount++;
    pendingPositions = [];
    pendingTimeStamps = [];

    if(flingCurve) {
      endFling(lastRafTimestamp);
    }
    seenTouchMove = false;
    velocityCalculator.reset();

    scrollPosition = scroller.scrollTop;
    pendingPositions.push(-e.changedTouches[0].clientY);
    pendingTimeStamps.push(e.timeStamp);
  });

  listener.addEventListener("touchmove", function(e) {
    // End interpolation if we're interpolating.
    if(flingCurve) {
      endFling(lastRafTimestamp);
    }
    var y = e.changedTouches[0].clientY;
    var newTouchPosition = -touchBase - y;

    // If this is the first touchmove, or if we're scrolling reset the touch move origin.
    if (!seenTouchMove || scrollPosition !== 0) {
//      reset_touch_move_base(y - self.getTouchPosition());
      reset_touch_move_base(y);
      newTouchPosition = -touchBase - y;
    }

    // This is necessary to prevent touchmove processing during rail scroll. We do
    // want to reset the touchBase on uncancellable touchmove events though.
    if (!e.cancelable) {
      return;
    }

    // If we would apply a giant touchmove delta, ignore it. This can happen if
    // we're breaking a scroll rail, for example.
//    if (Math.abs(newTouchPosition - touchPosition) > 100) {
//      reset_touch_move_base(y);
//      console.log("PREVENT 1");
//      e.preventDefault();
//      return;
//    }

    seenTouchMove = true;

    touchPosition = newTouchPosition;
    if (scroller.scrollTop === 0 && touchPosition < 0) {
      console.log("PREVENT 2");
      e.preventDefault();
      pendingPositions.push(-e.changedTouches[0].clientY);
      pendingTimeStamps.push(e.timeStamp);
    }
  });

  listener.addEventListener("scroll", function(e) {
    scrollPosition = scroller.scrollTop;
    if (flingCurve === null) {
      pendingPositions.push(scrollPosition);
      pendingTimeStamps.push(e.timeStamp);
    }
  });

  listener.addEventListener("touchend", function(e) {
    touchCount--;
    var y = e.changedTouches[0].clientY;
    touchPosition = -touchBase - y;
    pendingPositions.push(-e.changedTouches[0].clientY);
    pendingTimeStamps.push(e.timeStamp);
    if (scroller.scrollTop === 0 && touchPosition < 0) {
      pendingFling = true;
    }
  });

  listener.addEventListener("touchcancel", function(e) {
    touchCount--;
  });

  this.reset = function() {
    seenTouchMove = false;
    touchBase = 0;
    scrollPosition = 0;
    touchPosition = 0;
  };

  this.getScrollPosition = function() {
    return scrollPosition;
  };

  this.getTouchPosition = function() {
    return touchPosition;
  };

  this.setPosition = function(position) {
    flingCurve = null;
    touchPosition = 0;
    scrollPosition = position;
  }

  this.getPosition = function(ms) {
    if (flingCurve) {
      return flingCurve.getPositionAtTime(ms / 1000);
    }
    if (touchPosition < 0) {
      // This is scary: TODO - remove this.
      scrollPosition = 0;
      return touchPosition;
    }
    return scrollPosition;
  };

  function endFling(ms) {
    var position = self.getPosition(ms);
    if (position > 0) {
      touchPosition = 0;
      scroller.scrollTop = position;
    } else {
      touchPosition = position;
    }
    flingCurve = null;
  }

  // TODO - onPositionUpdate shouldn't be located here...
  function raf(ms) {
    if (flingCurve === null) {
      while(pendingPositions.length) {
        velocityCalculator.addValue(pendingPositions.shift(), pendingTimeStamps.shift());
      }
    } else {
      pendingPositions = [];
      pendingTimeStamps = [];
    }

    var position = self.getPosition(ms);

    if (flingCurve && flingCurve.doneFling(ms / 1000)) {
      console.log("DONEFLING");
      endFling(ms);
    }

    if(pendingFling || (!flingCurve && scrollPosition === 0 && touchPosition > 0)) {
      var velocity = velocityCalculator.getVelocity(ms);
//      console.log("velocity " + velocity);
      // Use the last RAF timestamp, so we can predict the location this frame.

      flingCurve = new FlingCurve(position, velocity, lastRafTimestamp / 1000);

      pendingPositions = [];
      pendingTimeStamps = [];

      pendingFling = false;
      position = self.getPosition(ms);
      if (self.onFlingIn) {
        self.onFlingIn(velocity / 1000);
      }
//      console.log("starting fling, position is " + position);
    }
    window.requestAnimationFrame(raf);
//    console.log("POSITION: " + position);
    onPositionUpdate(ms, position);
    lastRafTimestamp = ms;
  }
  window.requestAnimationFrame(raf);
}
