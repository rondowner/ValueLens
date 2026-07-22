"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const canvas = $("imageCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!window.ValueLensColor || !window.ValueLensValueMap ||
        !window.ValueLensViewport || !context) {
        document.body.textContent = "ValueLens could not start. Confirm that all project files are present.";
        return;
    }

    const release = window.ValueLensVersion || { version: "1.2.3", buildDate: "2026-07-22" };
    $("appVersion").textContent = `v${release.version}`;
    $("footerVersion").textContent = `v${release.version}`;
    $("buildDate").textContent = `Built ${release.buildDate}`;

    let selectedPoint = null;
    let measurement = null;
    let originalData = null;
    let mapData = null;
    let retainedValues = [];
    let showingMap = false;
    let sourceName = "value-map";

    const viewport = ValueLensViewport({
        container: $("canvasContainer"),
        stage: $("canvasStage"),
        canvas,
        onTap: point => {
            if (point.x >= 0 && point.y >= 0 && point.x < canvas.width && point.y < canvas.height) {
                selectedPoint = point;
                measure();
            }
        },
        onChange: scale => { $("zoomLevel").textContent = `${Math.round(scale * 100)}%`; }
    });

    $("zoomIn").onclick = viewport.zoomIn;
    $("zoomOut").onclick = viewport.zoomOut;
    $("fitImage").onclick = viewport.fit;
    $("actualSize").onclick = viewport.actual;
    $("sampleSize").onchange = () => selectedPoint && measure();
    $("targetValue").oninput = compare;
    $("targetTolerance").onchange = compare;
    $("clearTargetButton").onclick = () => { $("targetValue").value = ""; compare(); };
    $("generateMap").onclick = generateMap;
    $("showOriginal").onclick = toggleOriginal;
    $("saveMap").onclick = saveMap;
    document.querySelectorAll("[data-values]").forEach(button => {
        button.onclick = () => { $("mapValues").value = button.dataset.values; };
    });

    $("imageFile").addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            $("fileName").textContent = "Please choose an image file.";
            return;
        }
        const url = URL.createObjectURL(file);
        const image = new Image();
        $("fileName").textContent = `Loading ${file.name}…`;
        image.onload = () => {
            URL.revokeObjectURL(url);
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            context.drawImage(image, 0, 0);
            originalData = context.getImageData(0, 0, canvas.width, canvas.height);
            mapData = null;
            retainedValues = [];
            showingMap = false;
            selectedPoint = measurement = null;
            sourceName = file.name.replace(/\.[^.]+$/, "") || "value-map";
            $("fileName").textContent = `${file.name} — ${canvas.width} × ${canvas.height}`;
            $("imagePlaceholder").hidden = true;
            $("canvasContainer").hidden = false;
            $("viewportToolbar").hidden = false;
            $("emptyResult").hidden = false;
            $("measurementResult").hidden = true;
            $("showOriginal").disabled = true;
            $("saveMap").disabled = true;
            $("valueLegend").hidden = true;
            setMapStatus("Choose the Painter's Values you want to retain.");
            updateMode();
            requestAnimationFrame(viewport.fit);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            $("fileName").textContent = "ValueLens could not open that image.";
        };
        image.src = url;
    });

    function activeData() { return showingMap && mapData ? mapData : originalData; }
    function drawBase() {
        const data = activeData();
        if (data) context.putImageData(data, 0, 0);
    }
    function redraw() {
        drawBase();
        if (selectedPoint) drawCrosshair(selectedPoint.x, selectedPoint.y);
    }

    function generateMap() {
        if (!originalData) { setMapStatus("Open a photograph first.", true); return; }
        let values;
        try { values = ValueLensValueMap.parseValues($("mapValues").value); }
        catch (error) { setMapStatus(error.message, true); return; }

        $("generateMap").disabled = true;
        setMapStatus("Generating value map…");
        requestAnimationFrame(() => {
            try {
                mapData = ValueLensValueMap.generate(originalData, values);
                retainedValues = values;
                showingMap = true;
                selectedPoint = measurement = null;
                $("emptyResult").hidden = false;
                $("measurementResult").hidden = true;
                $("showOriginal").disabled = false;
                $("showOriginal").textContent = "Show Original";
                $("saveMap").disabled = false;
                renderLegend();
                redraw();
                updateMode();
                setMapStatus(`Map generated using Painter's Values ${values.join(", ")}.`);
            } catch (error) {
                setMapStatus(`The value map could not be generated: ${error.message}`, true);
            } finally {
                $("generateMap").disabled = false;
            }
        });
    }

    function toggleOriginal() {
        if (!mapData) return;
        showingMap = !showingMap;
        $("showOriginal").textContent = showingMap ? "Show Original" : "Show Value Map";
        selectedPoint = measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        redraw();
        updateMode();
    }

    function saveMap() {
        if (!mapData) return;
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = mapData.width;
        exportCanvas.height = mapData.height;
        exportCanvas.getContext("2d").putImageData(mapData, 0, 0);
        exportCanvas.toBlob(blob => {
            if (!blob) { setMapStatus("The browser could not create the PNG.", true); return; }
            const link = document.createElement("a");
            const values = retainedValues.join("-").replace(/\./g, "_");
            link.download = `${sourceName}-values-${values}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            setMapStatus(`Saved ${link.download}.`);
        }, "image/png");
    }

    function renderLegend() {
        const legend = $("valueLegend");
        legend.textContent = "";
        ValueLensValueMap.makeLegend(retainedValues).forEach(item => {
            const entry = document.createElement("div");
            entry.className = "legend-item";
            const swatch = document.createElement("span");
            swatch.className = "legend-swatch";
            swatch.style.background = `rgb(${item.gray},${item.gray},${item.gray})`;
            const label = document.createElement("span");
            label.textContent = `Value ${item.value}`;
            entry.append(swatch, label);
            legend.append(entry);
        });
        legend.hidden = false;
    }

    function setMapStatus(message, error = false) {
        $("mapStatus").textContent = message;
        $("mapStatus").className = `map-status${error ? " error" : ""}`;
    }
    function updateMode() { $("modeIndicator").textContent = showingMap ? "Painter's Value Map" : "Original"; }

    function averagePixels(centerX, centerY, requestedSize) {
        const half = Math.floor(requestedSize / 2);
        const left = Math.max(0, centerX - half);
        const top = Math.max(0, centerY - half);
        const right = Math.min(canvas.width - 1, centerX + half);
        const bottom = Math.min(canvas.height - 1, centerY + half);
        const width = right - left + 1;
        const height = bottom - top + 1;
        const pixels = context.getImageData(left, top, width, height).data;
        let red = 0, green = 0, blue = 0, alpha = 0;
        for (let index = 0; index < pixels.length; index += 4) {
            const weight = pixels[index + 3] / 255;
            red += pixels[index] * weight;
            green += pixels[index + 1] * weight;
            blue += pixels[index + 2] * weight;
            alpha += weight;
        }
        return { red: alpha ? Math.round(red / alpha) : 0, green: alpha ? Math.round(green / alpha) : 0, blue: alpha ? Math.round(blue / alpha) : 0, width, height };
    }

    function measure() {
        drawBase();
        const color = averagePixels(selectedPoint.x, selectedPoint.y, Number($("sampleSize").value));
        const lab = ValueLensColor.rgbToLab(color.red, color.green, color.blue);
        measurement = { ...color, lab, value: ValueLensColor.labLightnessToRoundedPainterValue(lab.l) };
        displayMeasurement();
        redraw();
    }
    function displayMeasurement() {
        const item = measurement;
        $("emptyResult").hidden = true;
        $("measurementResult").hidden = false;
        $("painterValue").textContent = item.value.toFixed(1);
        $("labL").textContent = item.lab.l.toFixed(1);
        $("labA").textContent = signed(item.lab.a);
        $("labB").textContent = signed(item.lab.b);
        $("rgbR").textContent = item.red;
        $("rgbG").textContent = item.green;
        $("rgbB").textContent = item.blue;
        $("hexValue").textContent = ValueLensColor.rgbToHex(item.red, item.green, item.blue);
        $("sampleDimensions").textContent = `${item.width} × ${item.height}`;
        $("sampleCoordinates").textContent = `x ${selectedPoint.x}, y ${selectedPoint.y}`;
        $("colorPreview").style.background = ValueLensColor.rgbToCss(item.red, item.green, item.blue);
        compare();
    }
    function signed(number) {
        const value = ValueLensColor.roundTo(number, 1);
        return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    }
    function compare() {
        const box = $("targetComparison");
        const raw = $("targetValue").value;
        const target = Number(raw);
        const tolerance = Number($("targetTolerance").value);
        if (!measurement || raw.trim() === "" || target < 1 || target > 10) { box.hidden = true; return; }
        const difference = measurement.value - target;
        const absolute = Math.abs(difference);
        box.hidden = false;
        box.className = `target-comparison ${absolute <= tolerance ? "good" : difference > 0 ? "too-light" : "too-dark"}`;
        $("targetMessage").textContent = absolute <= tolerance
            ? `On target: measured ${measurement.value.toFixed(1)}, planned ${target.toFixed(1)}.`
            : `Too ${difference > 0 ? "light" : "dark"} by ${absolute.toFixed(1)} value ${Math.abs(absolute - 1) < .05 ? "step" : "steps"}.`;
    }
    function drawCrosshair(x, y) {
        const radius = ValueLensColor.clamp(Math.min(canvas.width, canvas.height) * .018, 8, 30);
        const width = ValueLensColor.clamp(Math.min(canvas.width, canvas.height) * .002, 2, 5);
        context.save();
        [["rgba(0,0,0,.9)", width + 2], ["rgba(255,255,255,.95)", width]].forEach(([stroke, lineWidth]) => {
            context.strokeStyle = stroke; context.lineWidth = lineWidth; context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.moveTo(x - radius * 1.45, y); context.lineTo(x - radius * .35, y);
            context.moveTo(x + radius * .35, y); context.lineTo(x + radius * 1.45, y);
            context.moveTo(x, y - radius * 1.45); context.lineTo(x, y - radius * .35);
            context.moveTo(x, y + radius * .35); context.lineTo(x, y + radius * 1.45);
            context.stroke();
        });
        context.restore();
    }
});
