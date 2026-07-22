"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const canvas = $("imageCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!window.ValueLensColor || !window.ValueLensValueMap ||
        !window.ValueLensMassing || !window.ValueLensViewport || !context) {
        document.body.textContent = "ValueLens could not start. Confirm that all project files are present.";
        return;
    }

    const release = window.ValueLensVersion || { version: "1.3.1", buildDate: "2026-07-22" };
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
    let drawingMode = false;
    let drawingPointer = null;
    let lassoPoints = [];
    let lassoComplete = false;
    let baseMapData = null;
    let massingHistory = [];
    const MASSING_UNDO_LIMIT = 10;

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
    $("drawArea").onclick = beginDrawing;
    $("applyMassing").onclick = applyMassing;
    $("cancelMassing").onclick = () => cancelDrawing("Drawing cancelled.");
    $("undoMassing").onclick = undoMassing;
    document.querySelectorAll("[data-values]").forEach(button => {
        button.onclick = () => { $("mapValues").value = button.dataset.values; };
    });
    const drawingSurface = $("canvasContainer");
    drawingSurface.addEventListener("pointerdown", handleDrawingStart);
    drawingSurface.addEventListener("pointermove", handleDrawingMove);
    drawingSurface.addEventListener("pointerup", handleDrawingEnd);
    drawingSurface.addEventListener("pointercancel", handleDrawingCancel);

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
            resetMassing();
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
        if (drawingMode && lassoPoints.length) drawLasso();
        else if (selectedPoint) drawCrosshair(selectedPoint.x, selectedPoint.y);
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
                prepareMassing(values);
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
        if (drawingMode) cancelDrawing("Drawing cancelled when the view changed.");
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

    function resetMassing() {
        drawingMode = false;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        baseMapData = null;
        massingHistory = [];
        viewport.setInteractionEnabled(true);
        drawingSurface.classList.remove("drawing-area");
        $("massingValue").disabled = true;
        $("massingValue").innerHTML = "<option>Generate a value map first</option>";
        $("drawArea").disabled = true;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        $("undoMassing").disabled = true;
        setMassingStatus("Generate a value map to enable massing.");
    }

    function prepareMassing(values) {
        if (drawingMode) cancelDrawing();
        const select = $("massingValue");
        select.textContent = "";
        values.slice().reverse().forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = `Value ${value}`;
            select.append(option);
        });
        select.disabled = false;
        $("drawArea").disabled = false;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        baseMapData = mapData;
        massingHistory = [];
        $("undoMassing").disabled = true;
        setMassingStatus("Choose a value, then draw a free-form boundary around the area to simplify.");
    }

    function beginDrawing() {
        if (!mapData) return;
        if (!showingMap) {
            showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        drawingMode = true;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        selectedPoint = measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        viewport.setInteractionEnabled(false);
        drawingSurface.classList.add("drawing-area");
        $("drawArea").disabled = true;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = false;
        setMassingStatus("Draw around the area. Release to close the boundary.");
        redraw();
    }

    function handleDrawingStart(event) {
        if (!drawingMode || drawingPointer !== null) return;
        event.preventDefault();
        drawingPointer = event.pointerId;
        drawingSurface.setPointerCapture(event.pointerId);
        const point = boundedImagePoint(event);
        lassoPoints = point ? [point] : [];
        lassoComplete = false;
        redraw();
    }

    function handleDrawingMove(event) {
        if (!drawingMode || event.pointerId !== drawingPointer || !lassoPoints.length) return;
        event.preventDefault();
        const point = boundedImagePoint(event);
        if (!point) return;
        const previous = lassoPoints[lassoPoints.length - 1];
        const minimumSpacing = Math.max(1, 2 / viewport.getScale());
        if (Math.hypot(point.x - previous.x, point.y - previous.y) >= minimumSpacing) {
            lassoPoints.push(point);
            redraw();
        }
    }

    function handleDrawingEnd(event) {
        if (!drawingMode || event.pointerId !== drawingPointer) return;
        event.preventDefault();
        drawingPointer = null;
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            setMassingStatus("The boundary was too small. Draw a larger enclosed area.", true);
            redraw();
            return;
        }
        lassoComplete = true;
        $("applyMassing").disabled = false;
        setMassingStatus("Boundary ready. Apply the selected value or cancel and redraw.");
        redraw();
    }

    function handleDrawingCancel(event) {
        if (drawingMode && event.pointerId === drawingPointer) {
            drawingPointer = null;
            lassoPoints = [];
            lassoComplete = false;
            $("applyMassing").disabled = true;
            setMassingStatus("Drawing interrupted. Draw the boundary again.", true);
            redraw();
        }
    }

    function boundedImagePoint(event) {
        const point = viewport.imagePoint(event.clientX, event.clientY);
        if (point.x < 0 || point.y < 0 || point.x >= canvas.width || point.y >= canvas.height) return null;
        return point;
    }

    function applyMassing() {
        if (!mapData || !lassoComplete || lassoPoints.length < 3) return;
        const targetValue = Number($("massingValue").value);
        try {
            const result = ValueLensMassing.applyPolygon(mapData, lassoPoints, targetValue);
            mapData = result.imageData;
            massingHistory.push({
                points: lassoPoints.map(point => ({ x: point.x, y: point.y })),
                value: targetValue
            });
            if (massingHistory.length > MASSING_UNDO_LIMIT) {
                const committedOperation = massingHistory.shift();
                baseMapData = ValueLensMassing.applyPolygon(
                    baseMapData,
                    committedOperation.points,
                    committedOperation.value
                ).imageData;
            }
            cancelDrawing();
            $("undoMassing").disabled = false;
            setMassingStatus(`Assigned Value ${targetValue} to the drawn area (${result.changed.toLocaleString()} image locations changed).`);
            redraw();
        } catch (error) {
            setMassingStatus(error.message, true);
        }
    }

    function undoMassing() {
        if (!massingHistory.length || !baseMapData) {
            $("undoMassing").disabled = true;
            setMassingStatus("Undo limit reached. There are no earlier massing changes available.");
            return;
        }
        massingHistory.pop();
        rebuildMassingHistory();
        if (massingHistory.length === 0) {
            $("undoMassing").disabled = true;
            setMassingStatus("Undo limit reached. There are no earlier massing changes available.");
        } else {
            $("undoMassing").disabled = false;
            setMassingStatus("The last massing change was undone.");
        }
        redraw();
    }

    function rebuildMassingHistory() {
        let rebuilt = baseMapData;
        for (const operation of massingHistory) {
            rebuilt = ValueLensMassing.applyPolygon(
                rebuilt,
                operation.points,
                operation.value
            ).imageData;
        }
        mapData = rebuilt;
    }

    function cancelDrawing(message = "") {
        drawingMode = false;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        viewport.setInteractionEnabled(true);
        drawingSurface.classList.remove("drawing-area");
        $("drawArea").disabled = !mapData;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        if (message) setMassingStatus(message);
        redraw();
    }

    function setMassingStatus(message, error = false) {
        $("massingStatus").textContent = message;
        $("massingStatus").className = `massing-status${error ? " error" : ""}`;
    }

    function drawLasso() {
        if (lassoPoints.length < 2) return;
        context.save();
        context.beginPath();
        context.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for (let index = 1; index < lassoPoints.length; index += 1) {
            context.lineTo(lassoPoints[index].x, lassoPoints[index].y);
        }
        if (lassoComplete) context.closePath();
        context.lineWidth = Math.max(1, 2 / viewport.getScale());
        context.setLineDash([6 / viewport.getScale(), 4 / viewport.getScale()]);
        context.strokeStyle = "#ff3b30";
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = Math.max(1, 1 / viewport.getScale());
        context.strokeStyle = "white";
        context.stroke();
        context.restore();
    }

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
