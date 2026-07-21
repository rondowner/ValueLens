# ValueLens 1.1.1

ValueLens is a browser-based studio tool that samples a photograph, reports CIELAB color, and estimates Painter's Value on a 1–10 scale.

## Run

Open `index.html` in a modern browser or publish the project with GitHub Pages. No compilation or installation is required.

## Use

1. Choose a JPEG, PNG, or other browser-supported image.
2. Tap or click a representative area to measure it.
3. Select an averaging size; 5 × 5 or 9 × 9 is usually stable.
4. Optionally enter a planned value and tolerance.

## Pan and zoom

- Mouse wheel: zoom around the pointer.
- Pinch: zoom around the midpoint of two touches.
- Drag: pan the image with mouse, touch, or stylus.
- **Fit Image**: fit and center the whole image.
- **100%**: show one image pixel at one CSS pixel.
- **+ / −**: zoom in or out around the viewport center.

A short tap or click samples the image. Dragging navigates without changing the sample. The crosshair and measurements remain aligned at every zoom level.

## Structure

```text
ValueLens/
├── index.html
├── README.md
├── CHANGELOG.md
├── js/
│   ├── app.js
│   ├── color.js
│   ├── version.js
│   └── viewport.js
└── styles/
    └── styles.css
```

## Accuracy

Painter's Value is an estimate derived from CIELAB L*. It is not a certified Munsell measurement. Camera exposure, white balance, lighting, glare, and shadows affect the result.

## Version

The header and footer display the running version. Version 1.1.1 was built on 2026-07-21.
