const SWIPE_MAP = {
  UP: 0, // Up
  RIGHT: 1, // Right
  DOWN: 2, // Down
  LEFT: 3 // Left
};

export default function swipeListenner(el, callback) {
  let touchsurface = el,
    swipedir,
    startX,
    startY,
    distX,
    distY,
    threshold = 50, //required min distance traveled to be considered swipe
    restraint = 100, // maximum distance allowed at the same time in perpendicular direction
    allowedTime = 300, // maximum time allowed to travel that distance
    elapsedTime,
    startTime,
    handleswipe = callback;

  touchsurface.addEventListener(
    "touchstart",
    event => {
      const touchobj = event.changedTouches[0];
      swipedir = "NONE";
      startX = touchobj.pageX;
      startY = touchobj.pageY;
      startTime = new Date().getTime(); // record time when finger first makes contact with surface
      event.preventDefault();
    },
    false
  );

  touchsurface.addEventListener(
    "touchmove",
    event => {
      event.preventDefault(); // prevent scrolling when inside DIV
    },
    false
  );

  touchsurface.addEventListener(
    "touchend",
    event => {
      const touchobj = event.changedTouches[0];
      distX = touchobj.pageX - startX; // get horizontal dist traveled by finger while in contact with surface
      distY = touchobj.pageY - startY; // get vertical dist traveled by finger while in contact with surface
      elapsedTime = new Date().getTime() - startTime; // get time elapsed
      if (elapsedTime <= allowedTime) {
        // first condition for awipe met
        if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
          // 2nd condition for horizontal swipe met
          swipedir = distX < 0 ? SWIPE_MAP.LEFT : SWIPE_MAP.RIGHT; // if dist traveled is negative, it indicates left swipe
        } else if (
          Math.abs(distY) >= threshold &&
          Math.abs(distX) <= restraint
        ) {
          // 2nd condition for vertical swipe met
          swipedir = distY < 0 ? SWIPE_MAP.UP : SWIPE_MAP.DOWN; // if dist traveled is negative, it indicates up swipe
        }
      }
      handleswipe(swipedir);
      event.preventDefault();
    },
    false
  );
}
