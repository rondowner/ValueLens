# Changelog

## 1.2.3 - 2026-07-22

- Corrected Fit Image so smaller images can be enlarged beyond 100% to fill the available workspace while remaining completely visible.

## 1.2.2 - 2026-07-22

- Simplified all value-map preset buttons to single-line labels.
- Removed the redundant value lists beneath the preset names.

## 1.2.1 - 2026-07-22

- Added a Notan preset using Painter's Values 1 and 10.
- Reformatted preset buttons with compact two-line labels.
- Added independent vertical scrolling for the controls and image workspace on desktop.
- Preserved natural page scrolling on narrow phone layouts.

## 1.2.0 - 2026-07-21

- Added user-defined Painter's Value maps.
- Added convenient 3-value, 5-value, and 7-value presets.
- Added a numbered gray-value legend.
- Added switching between original and value-map views.
- Added full-resolution PNG export without the sampling crosshair.
- Added `js/valueMap.js` as a separate image-processing module.

## 1.1.1 - 2026-07-21

- Restored the crosshair cursor whenever the image is ready for sampling.
- Kept the hand cursor only while a drag-to-pan gesture is active.
- Added cleanup for interrupted pointer gestures.

## 1.1.0 - 2026-07-21

- Added mouse-wheel and pinch zoom.
- Added mouse, touch, and stylus panning.
- Added Fit Image, 100%, zoom-in, and zoom-out controls.
- Added visible version and build date.

## 1.0.0

- Initial image loading and sampling prototype.
- Added RGB, Hex, CIELAB, and estimated Painter's Value.
- Added configurable averaging and optional target comparison.
