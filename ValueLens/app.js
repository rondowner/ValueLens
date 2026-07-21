
"use strict";



/*

    ============================================================

    ValueLens prototype

    app.js



    Responsibilities:



    - Load an image selected by the user

    - Draw it on the HTML canvas

    - Convert tap/click coordinates to image coordinates

    - Average pixels around the selected point

    - Convert the averaged RGB color to CIELAB

    - Estimate a painter's value

    - Compare the result with an optional target value

    - Draw a crosshair over the selected point

    ============================================================

*/





document.addEventListener("DOMContentLoaded", () => {



    /*

        --------------------------------------------------------

        Confirm that color.js loaded correctly

        --------------------------------------------------------

    */



    if (!window.ValueLensColor) {

        showFatalError(

            "ValueLens could not start because color.js was not loaded."

        );

        return;

    }





    /*

        --------------------------------------------------------

        Get references to page elements

        --------------------------------------------------------

    */



    const imageFileInput = document.getElementById("imageFile");

    const fileNameText = document.getElementById("fileName");



    const sampleSizeSelect = document.getElementById("sampleSize");



    const imagePlaceholder = document.getElementById("imagePlaceholder");

    const canvasContainer = document.getElementById("canvasContainer");

    const imageCanvas = document.getElementById("imageCanvas");



    const emptyResult = document.getElementById("emptyResult");

    const measurementResult = document.getElementById("measurementResult");



    const painterValueText = document.getElementById("painterValue");



    const labLText = document.getElementById("labL");

    const labAText = document.getElementById("labA");

    const labBText = document.getElementById("labB");



    const rgbRText = document.getElementById("rgbR");

    const rgbGText = document.getElementById("rgbG");

    const rgbBText = document.getElementById("rgbB");



    const hexValueText = document.getElementById("hexValue");

    const sampleDimensionsText = document.getElementById("sampleDimensions");



    const colorPreview = document.getElementById("colorPreview");

    const sampleCoordinatesText = document.getElementById(

        "sampleCoordinates"

    );



    const targetValueInput = document.getElementById("targetValue");

    const targetToleranceSelect = document.getElementById(

        "targetTolerance"

    );

    const clearTargetButton = document.getElementById(

        "clearTargetButton"

    );



    const targetComparison = document.getElementById(

        "targetComparison"

    );

    const targetMessage = document.getElementById("targetMessage");





    /*

        --------------------------------------------------------

        Canvas setup

        --------------------------------------------------------

    */



    const canvasContext = imageCanvas.getContext(

        "2d",

        {

            willReadFrequently: true

        }

    );



    if (!canvasContext) {

        showFatalError(

            "Your browser does not support the canvas features required by ValueLens."

        );

        return;

    }





    /*

        --------------------------------------------------------

        Application state

        --------------------------------------------------------

    */



    let loadedImage = null;



    /*

        The canvas contains the original image dimensions.



        CSS may display the canvas much smaller than its true pixel

        dimensions. Pointer coordinates therefore have to be scaled

        back to the canvas coordinate system.

    */



    let selectedPoint = null;



    /*

        Keep the most recent measurement so the target value can be

        changed without requiring the user to tap the image again.

    */



    let currentMeasurement = null;





    /*

        --------------------------------------------------------

        Event listeners

        --------------------------------------------------------

    */



    imageFileInput.addEventListener(

        "change",

        handleImageFileSelection

    );



    /*

        Pointer events work for mouse, touch, and stylus input.

    */



    imageCanvas.addEventListener(

        "pointerdown",

        handleCanvasPointer

    );



    sampleSizeSelect.addEventListener(

        "change",

        handleSampleSizeChange

    );



    targetValueInput.addEventListener(

        "input",

        updateTargetComparison

    );



    targetToleranceSelect.addEventListener(

        "change",

        updateTargetComparison

    );



    clearTargetButton.addEventListener(

        "click",

        clearTargetValue

    );





    /*

        --------------------------------------------------------

        Image loading

        --------------------------------------------------------

    */





    /**

     * Handle a file selected through the image input.

     *

     * @param {Event} event

     */

    function handleImageFileSelection(event) {

        const selectedFiles = event.target.files;



        if (!selectedFiles || selectedFiles.length === 0) {

            return;

        }



        const file = selectedFiles[0];



        if (!file.type.startsWith("image/")) {

            fileNameText.textContent =

                "The selected file is not recognized as an image.";



            imageFileInput.value = "";

            return;

        }



        fileNameText.textContent = `Loading ${file.name}…`;



        const objectUrl = URL.createObjectURL(file);

        const image = new Image();



        image.onload = () => {

            URL.revokeObjectURL(objectUrl);



            loadedImage = image;

            selectedPoint = null;

            currentMeasurement = null;



            prepareCanvasForImage(image);



            fileNameText.textContent =

                `${file.name} — ${image.naturalWidth} × ${image.naturalHeight} pixels`;



            imagePlaceholder.hidden = true;

            canvasContainer.hidden = false;



            clearDisplayedMeasurement();

        };



        image.onerror = () => {

            URL.revokeObjectURL(objectUrl);



            loadedImage = null;

            fileNameText.textContent =

                "ValueLens could not open that image.";



            imageFileInput.value = "";

        };



        image.src = objectUrl;

    }





    /**

     * Resize the canvas to the image's original dimensions and

     * draw the image.

     *

     * @param {HTMLImageElement} image

     */

    function prepareCanvasForImage(image) {

        imageCanvas.width = image.naturalWidth;

        imageCanvas.height = image.naturalHeight;



        redrawCanvas();

    }





    /*

        --------------------------------------------------------

        Pointer handling

        --------------------------------------------------------

    */





    /**

     * Handle a mouse click or touch on the canvas.

     *

     * @param {PointerEvent} event

     */

    function handleCanvasPointer(event) {

        if (!loadedImage) {

            return;

        }



        event.preventDefault();



        const point = pointerEventToCanvasPoint(event);



        selectedPoint = point;



        measureSelectedPoint();

    }





    /**

     * Convert coordinates from the canvas's displayed CSS size

     * into the canvas's true image-pixel coordinates.

     *

     * @param {PointerEvent} event

     * @returns {{x: number, y: number}}

     */

    function pointerEventToCanvasPoint(event) {

        const canvasBounds = imageCanvas.getBoundingClientRect();



        const horizontalScale =

            imageCanvas.width / canvasBounds.width;



        const verticalScale =

            imageCanvas.height / canvasBounds.height;



        const x = Math.floor(

            (event.clientX - canvasBounds.left) *

            horizontalScale

        );



        const y = Math.floor(

            (event.clientY - canvasBounds.top) *

            verticalScale

        );



        return {

            x: ValueLensColor.clamp(

                x,

                0,

                imageCanvas.width - 1

            ),

            y: ValueLensColor.clamp(

                y,

                0,

                imageCanvas.height - 1

            )

        };

    }





    /*

        --------------------------------------------------------

        Sampling and measurement

        --------------------------------------------------------

    */





    /**

     * Recalculate the measurement if the user changes the

     * averaging size.

     */

    function handleSampleSizeChange() {

        if (selectedPoint) {

            measureSelectedPoint();

        }

    }





    /**

     * Read the pixels around the selected point, average them,

     * perform the color conversion, and update the interface.

     */

    function measureSelectedPoint() {

        if (!loadedImage || !selectedPoint) {

            return;

        }



        /*

            Redraw the plain image before reading pixels.



            This is important because the crosshair is drawn directly

            on the same canvas. Without redrawing first, a later sample

            near the crosshair could accidentally include crosshair

            pixels in its average.

        */



        redrawCanvas();



        const requestedSampleSize = Number(

            sampleSizeSelect.value

        );



        const sampledColor = averagePixelsAroundPoint(

            selectedPoint.x,

            selectedPoint.y,

            requestedSampleSize

        );



        const lab = ValueLensColor.rgbToLab(

            sampledColor.red,

            sampledColor.green,

            sampledColor.blue

        );



        const painterValue =

            ValueLensColor.labLightnessToRoundedPainterValue(

                lab.l

            );



        currentMeasurement = {

            point: {

                x: selectedPoint.x,

                y: selectedPoint.y

            },

            red: sampledColor.red,

            green: sampledColor.green,

            blue: sampledColor.blue,

            lab,

            painterValue,

            sampleWidth: sampledColor.sampleWidth,

            sampleHeight: sampledColor.sampleHeight

        };



        displayMeasurement(currentMeasurement);



        drawCrosshair(

            selectedPoint.x,

            selectedPoint.y

        );

    }





    /**

     * Average an area centered around the selected pixel.

     *

     * Near an image edge, the sample rectangle is clipped so it

     * stays inside the image. Therefore, a requested 9 × 9 sample

     * may become smaller when the point is close to an edge.

     *

     * @param {number} centerX

     * @param {number} centerY

     * @param {number} requestedSize

     * @returns {{

     *   red: number,

     *   green: number,

     *   blue: number,

     *   sampleWidth: number,

     *   sampleHeight: number

     * }}

     */

    function averagePixelsAroundPoint(

        centerX,

        centerY,

        requestedSize

    ) {

        /*

            All available sample sizes are odd, so the point stays

            in the center of the rectangle.

        */



        const halfSize = Math.floor(requestedSize / 2);



        const left = Math.max(

            0,

            centerX - halfSize

        );



        const top = Math.max(

            0,

            centerY - halfSize

        );



        const right = Math.min(

            imageCanvas.width - 1,

            centerX + halfSize

        );



        const bottom = Math.min(

            imageCanvas.height - 1,

            centerY + halfSize

        );



        const sampleWidth = right - left + 1;

        const sampleHeight = bottom - top + 1;



        const imageData = canvasContext.getImageData(

            left,

            top,

            sampleWidth,

            sampleHeight

        );



        const pixels = imageData.data;



        let totalRed = 0;

        let totalGreen = 0;

        let totalBlue = 0;

        let totalAlphaWeight = 0;



        /*

            Canvas image data is stored as repeating groups:



                red, green, blue, alpha



            Transparent pixels are weighted by alpha rather than

            treated as opaque black.

        */



        for (let index = 0; index < pixels.length; index += 4) {

            const alphaWeight = pixels[index + 3] / 255;



            totalRed += pixels[index] * alphaWeight;

            totalGreen += pixels[index + 1] * alphaWeight;

            totalBlue += pixels[index + 2] * alphaWeight;

            totalAlphaWeight += alphaWeight;

        }



        /*

            Fully transparent images are unusual, but avoid division

            by zero in case the sampled area contains no visible pixels.

        */



        if (totalAlphaWeight === 0) {

            return {

                red: 0,

                green: 0,

                blue: 0,

                sampleWidth,

                sampleHeight

            };

        }



        return {

            red: Math.round(totalRed / totalAlphaWeight),

            green: Math.round(totalGreen / totalAlphaWeight),

            blue: Math.round(totalBlue / totalAlphaWeight),

            sampleWidth,

            sampleHeight

        };

    }





    /*

        --------------------------------------------------------

        Displaying measurements

        --------------------------------------------------------

    */





    /**

     * Update all measurement fields on the page.

     *

     * @param {Object} measurement

     */

    function displayMeasurement(measurement) {

        emptyResult.hidden = true;

        measurementResult.hidden = false;



        painterValueText.textContent =

            measurement.painterValue.toFixed(1);



        labLText.textContent =

            ValueLensColor.roundTo(

                measurement.lab.l,

                1

            ).toFixed(1);



        labAText.textContent =

            formatSignedNumber(measurement.lab.a);



        labBText.textContent =

            formatSignedNumber(measurement.lab.b);



        rgbRText.textContent = measurement.red;

        rgbGText.textContent = measurement.green;

        rgbBText.textContent = measurement.blue;



        hexValueText.textContent =

            ValueLensColor.rgbToHex(

                measurement.red,

                measurement.green,

                measurement.blue

            );



        sampleDimensionsText.textContent =

            `${measurement.sampleWidth} × ${measurement.sampleHeight}`;



        sampleCoordinatesText.textContent =

            `x ${measurement.point.x}, y ${measurement.point.y}`;



        colorPreview.style.background =

            ValueLensColor.rgbToCss(

                measurement.red,

                measurement.green,

                measurement.blue

            );



        updateTargetComparison();

    }





    /**

     * Format positive CIELAB a* and b* values with a plus sign.

     *

     * @param {number} value

     * @returns {string}

     */

    function formatSignedNumber(value) {

        const roundedValue = ValueLensColor.roundTo(value, 1);

        const fixedValue = roundedValue.toFixed(1);



        if (roundedValue > 0) {

            return `+${fixedValue}`;

        }



        return fixedValue;

    }





    /**

     * Reset the measurement panel when a new image is loaded.

     */

    function clearDisplayedMeasurement() {

        emptyResult.hidden = false;

        measurementResult.hidden = true;



        targetComparison.hidden = true;

        targetComparison.className = "target-comparison";



        colorPreview.style.background = "";

    }





    /*

        --------------------------------------------------------

        Target comparison

        --------------------------------------------------------

    */





    /**

     * Remove the planned target value.

     */

    function clearTargetValue() {

        targetValueInput.value = "";

        updateTargetComparison();

    }





    /**

     * Compare the measured value with the optional planned value.

     */

    function updateTargetComparison() {

        if (!currentMeasurement) {

            targetComparison.hidden = true;

            return;

        }



        const targetValue = Number(targetValueInput.value);

        const tolerance = Number(targetToleranceSelect.value);



        if (

            targetValueInput.value.trim() === "" ||

            !Number.isFinite(targetValue) ||

            targetValue < 1 ||

            targetValue > 10

        ) {

            targetComparison.hidden = true;

            targetComparison.className = "target-comparison";

            return;

        }



        const measuredValue = currentMeasurement.painterValue;

        const difference = measuredValue - targetValue;

        const absoluteDifference = Math.abs(difference);



        targetComparison.hidden = false;

        targetComparison.className = "target-comparison";



        if (absoluteDifference <= tolerance) {

            targetComparison.classList.add("good");



            targetMessage.textContent =

                `On target: measured ${measuredValue.toFixed(1)}, ` +

                `planned ${targetValue.toFixed(1)}.`;



            return;

        }



        if (difference > 0) {

            targetComparison.classList.add("too-light");



            targetMessage.textContent =

                `Too light by ${absoluteDifference.toFixed(1)} value ` +

                `${pluralizeValueUnit(absoluteDifference)}.`;



            return;

        }



        targetComparison.classList.add("too-dark");



        targetMessage.textContent =

            `Too dark by ${absoluteDifference.toFixed(1)} value ` +

            `${pluralizeValueUnit(absoluteDifference)}.`;

    }





    /**

     * Return "step" or "steps" for target-comparison messages.

     *

     * @param {number} amount

     * @returns {string}

     */

    function pluralizeValueUnit(amount) {

        return Math.abs(amount - 1) < 0.05

            ? "step"

            : "steps";

    }





    /*

        --------------------------------------------------------

        Canvas drawing

        --------------------------------------------------------

    */





    /**

     * Clear the canvas and redraw the unmarked image.

     */

    function redrawCanvas() {

        if (!loadedImage) {

            return;

        }



        canvasContext.clearRect(

            0,

            0,

            imageCanvas.width,

            imageCanvas.height

        );



        canvasContext.drawImage(

            loadedImage,

            0,

            0,

            imageCanvas.width,

            imageCanvas.height

        );

    }





    /**

     * Draw a visible crosshair over the sampled point.



     * The crosshair size scales with image resolution so it remains

     * visible on both small and high-resolution photographs.

     *

     * @param {number} x

     * @param {number} y

     */

    function drawCrosshair(x, y) {

        const shortestImageDimension = Math.min(

            imageCanvas.width,

            imageCanvas.height

        );



        const radius = ValueLensColor.clamp(

            shortestImageDimension * 0.018,

            8,

            30

        );



        const lineWidth = ValueLensColor.clamp(

            shortestImageDimension * 0.002,

            2,

            5

        );



        canvasContext.save();



        /*

            Draw a dark outer crosshair first.

        */



        canvasContext.strokeStyle = "rgba(0, 0, 0, 0.9)";

        canvasContext.lineWidth = lineWidth + 2;



        drawCrosshairShape(x, y, radius);



        /*

            Draw a white inner crosshair on top. The contrasting

            outlines make the mark visible over both dark and light

            colors.

        */



        canvasContext.strokeStyle = "rgba(255, 255, 255, 0.95)";

        canvasContext.lineWidth = lineWidth;



        drawCrosshairShape(x, y, radius);



        canvasContext.restore();

    }





    /**

     * Draw the actual crosshair path using the current stroke style.

     *

     * @param {number} x

     * @param {number} y

     * @param {number} radius

     */

    function drawCrosshairShape(x, y, radius) {

        const centerGap = radius * 0.35;



        canvasContext.beginPath();



        canvasContext.arc(

            x,

            y,

            radius,

            0,

            Math.PI * 2

        );



        canvasContext.moveTo(

            x - radius * 1.45,

            y

        );



        canvasContext.lineTo(

            x - centerGap,

            y

        );



        canvasContext.moveTo(

            x + centerGap,

            y

        );



        canvasContext.lineTo(

            x + radius * 1.45,

            y

        );



        canvasContext.moveTo(

            x,

            y - radius * 1.45

        );



        canvasContext.lineTo(

            x,

            y - centerGap

        );



        canvasContext.moveTo(

            x,

            y + centerGap

        );



        canvasContext.lineTo(

            x,

            y + radius * 1.45

        );



        canvasContext.stroke();

    }





    /*

        --------------------------------------------------------

        Fatal error display

        --------------------------------------------------------

    */





    /**

     * Replace the page body with a readable startup-error message.

     *

     * @param {string} message

     */

    function showFatalError(message) {

        document.body.innerHTML = "";



        const errorContainer = document.createElement("main");

        errorContainer.style.maxWidth = "42rem";

        errorContainer.style.margin = "3rem auto";

        errorContainer.style.padding = "1.5rem";

        errorContainer.style.fontFamily =

            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';



        const heading = document.createElement("h1");

        heading.textContent = "ValueLens could not start";



        const paragraph = document.createElement("p");

        paragraph.textContent = message;



        const advice = document.createElement("p");

        advice.textContent =

            "Confirm that index.html, styles.css, color.js, and app.js " +

            "are all in the same folder.";



        errorContainer.append(

            heading,

            paragraph,

            advice

        );



        document.body.appendChild(errorContainer);

    }



});