function OverscrollPhysics(max_offset) {
  // Constants to configure spring physics
  this.SPRING_CONSTANT = 0.0003;
  this.DAMPING = 0.5;
  this.SPRING_LERP_POW = 4;
  this.FRICTION = 0.95;

  var self = this;
  var d = 0;
  var v = 0;
  var target = null;
  var prev_time = 0;

  // Time since last fling, or null if not in fling.
  var fling_time = null;

  this.setTarget = function(t) {
    target = t;
    v = 0;
    fling_time = null;
    prev_time = 0;
  }

  this.setVelocity = function(vel) {
    fling_time = 0;
    v = vel;
  }

  this.addFriction = function(delta) {
    if (delta < 0) {
      return delta;
    }

    delta = delta / max_offset;
    return max_offset * delta / (1 + delta);
  }

  this.reachedTarget = function() {
    return Math.abs(d - target) < 1 && v === 0;
  }

  this.step = function(time) {
    if (target === null && v === 0) {
      return false;
    }

    var current_distance = d;

    var target_pos = target === null ? 0 : target;
//    var delta = time - prev_time;
    var delta = 16;

    // If we don't have information on elapsed time, assume it's been 16 ms
    // since the last update.
//    if (prev_time === 0) {
//      delta = 16;
//    }

    prev_time = time;
    if (fling_time !== null) {
      fling_time += delta;
    }

    var lerp = 1;
    if (fling_time !== null && fling_time < 500) {
      lerp = fling_time / 500;
    }

    var a = Math.pow(lerp, this.SPRING_LERP_POW) *
        (this.SPRING_CONSTANT * (target - d));
    v *= this.FRICTION;
    v += a * delta;
    // Using the velocity after applying the acceleration due to the spring
    // keeps the simulation more stable.
    var dampening = Math.pow(lerp, this.SPRING_LERP_POW) * this.DAMPING * v;
    v -= dampening;
    d += v * delta;

    if (target_pos - d > -0.1 && v <= 0) {
      v = 0;
      d = target;
      console.log("NULL TARGET 1");
//      target = null;
      prev_time = 0;
    }

    return d !== current_distance;
  }

  this.setOffset = function(o) {
    fling_time = Number.MAX_VALUE;
    prev_time = 0;
//    target = null;
    d = o;
    v = 0;
  }

  this.getOffset = function() {
    return d;
  }
}

Polymer('polymer-p2r', {
  ready: function() {
    var self = this;
    var p2r = self.$.p2r;
    var scroller = self.$.scroller;

    var scrollcontent = self.$.scrollcontent;
    var loadingOffset = 150;
    var fingersDown = 0;

    var overscrollPhysics = new OverscrollPhysics(window.innerHeight);
    var overscrollHandler;

    function getHeaderClassName() {
      return self.className;
    }

    function setHeaderClassName(name) {
      self.className = name;
    }

    function translateY(element, offset) {
      element.style.webkitTransform = 'translate3d(0, ' + offset + 'px, 0)';
    }

    function checkPulled() {
      if (fingersDown === 0) {
        return;
      }
      var triggerOffset = 60;
      if (getHeaderClassName() != 'loading') {
        setHeaderClassName(overscrollPhysics.getOffset() > triggerOffset ? 'pulled' : '');
      }
    }

    var lastPosition = 0;
    function onPositionUpdate(time, position) {
      if (!fingersDown && overscrollPhysics.step(time)) {
        overscrollHandler.setPosition(-overscrollPhysics.getOffset());
      }

      if (position > 0) {
        position = 0;
      }
      if (position != lastPosition && fingersDown) {
        overscrollPhysics.setOffset(-position);
      }
      var offset = overscrollPhysics.addFriction(overscrollPhysics.getOffset());
      var clientHeight = p2r.clientHeight;

      checkPulled();
      translateY(scrollcontent, offset);
      translateY(p2r, offset - clientHeight);
    }

    function isP2rVisible() {
      return scroller.scrollTop <= overscrollPhysics.getOffset();
    }

    function isPulling() {
      return overscrollPhysics.getOffset() > 0;
    }

    scroller.addEventListener('touchstart', function(e) {
      fingersDown++;
    });

    function finishPull(e) {
      fingersDown--;

      if (!isPulling() || fingersDown != 0 || !isP2rVisible()) {
        return;
      }

      if (getHeaderClassName() == 'pulled') {
        setTimeout(finishLoading, 2000);
        overscrollPhysics.setTarget(loadingOffset);
      } else {
        overscrollPhysics.setTarget(Math.max(0, scroller.scrollTop));
      }
    }

    function finishLoading() {
      setHeaderClassName('');
      if (isP2rVisible() && fingersDown == 0) {
        overscrollPhysics.setTarget(Math.max(0, scroller.scrollTop));
      }
    }

    function onFlingIn(velocity) {
      overscrollPhysics.setTarget(0);
      overscrollPhysics.setVelocity(velocity);
    }

    scroller.addEventListener('touchcancel', finishPull);
    scroller.addEventListener('touchend', finishPull);
    overscrollHandler = new OverscrollHandler(scroller, scroller, onPositionUpdate);
    overscrollHandler.onFlingIn = onFlingIn;
  }
});
