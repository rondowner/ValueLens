# ValueLens 1.2.3

ValueLens is a browser-based studio tool that samples a photograph, reports CIELAB color, estimates Painter's Value on a 1-10 scale, and creates simplified value maps.

## Run

Open `index.html` in a modern browser or publish the project with GitHub Pages. No compilation or installation is required.

## Measure a color

1. Choose a browser-supported image.
2. Tap or click a representative area.
3. Select an averaging size; 5 x 5 or 9 x 9 is usually stable.
4. Optionally enter a planned value and tolerance.

## Pan and zoom

- Mouse wheel: zoom around the pointer.
- Pinch: zoom around the midpoint of two touches.
- Drag: pan with mouse, touch, or stylus.
- **Fit Image**: fit and center the whole image, enlarging it beyond 100% when needed.
- **100%**: show one image pixel at one CSS pixel.
- **+ / -**: zoom around the viewport center.

A short tap or click samples the image. Dragging navigates without changing the sample.

## Create a Painter's Value Map

1. Enter the exact Painter's Values to retain, such as `1, 3, 5, 7, 9`, or choose a preset.
2. Select **Generate Map**. Each part of the photograph is assigned to the nearest retained value.
3. Use **Show Original** and **Show Value Map** to compare them.
4. Select **Save PNG** to download a clean, full-resolution map.

The saved PNG does not contain the sampling crosshair or interface controls. The on-screen legend identifies every gray by its Painter's Value number.

The presets include **Notan** (Values 1 and 10) plus three-, five-, and seven-value studies. On desktop, the controls and image workspace scroll independently so the reference remains in view while using controls farther down the page.

## Structure

```text
ValueLens/
|-- index.html
|-- README.md
|-- CHANGELOG.md
|-- js/
|   |-- app.js
|   |-- color.js
|   |-- valueMap.js
|   |-- version.js
|   `-- viewport.js
`-- styles/
    `-- styles.css
```

## Accuracy

Painter's Value is an estimate derived from CIELAB L*. It is not a certified Munsell measurement. Camera exposure, white balance, lighting, glare, and shadows affect the result.

## Version

The header and footer display the running version. Version 1.2.3 was built on 2026-07-22.
