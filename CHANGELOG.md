# Changelog

## 1.1.1 — 2026-07-21

- Restored the crosshair cursor whenever the image is ready for sampling.
- Kept the hand cursor only while a drag-to-pan gesture is active.
- Added cleanup for interrupted pointer gestures.

## 1.1.0 — 2026-07-21

- Added mouse-wheel zoom centered on the pointer.
- Added pinch zoom centered between touches on iPhone and other touch devices.
- Added mouse, touch, and stylus drag-to-pan.
- Added Fit Image, 100%, zoom-in, and zoom-out controls.
- Added sensible pan limits so the image remains recoverable.
- Preserved correct image sampling and crosshair placement after transforms.
- Added visible version and build date.
- Preserved the `js/` and `styles/` directory structure.

## 1.0.0

- Initial image loading and sampling prototype.
- Added RGB, Hex, CIELAB, and estimated Painter's Value.
- Added configurable sample averaging and optional target comparison.
