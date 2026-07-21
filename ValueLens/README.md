# ValueLens Prototype



Version 1.0 (Prototype)



Author: ChatGPT and Ron Downer



---



## Purpose



ValueLens is a tool designed specifically for painters.



Its purpose is **not** to identify paint colors.



Its purpose is to answer the question:



> "Did I actually mix the value I intended?"



The program measures the average color of a selected area in a photograph, converts it to CIELAB color space, and estimates a Painter's Value on a 1–10 scale.



---



## Current Features



✓ Load an image from your computer



✓ Click or tap anywhere on the image



✓ Average a 1×1, 3×3, 5×5, 9×9 or 15×15 pixel area



✓ Display



- RGB

- Hex color

- CIELAB L*

- CIELAB a*

- CIELAB b*

- Estimated Painter's Value (1–10)



✓ Compare the measured value with a planned target value



✓ Draw a crosshair showing the sampled location



---



## Folder Structure



```

ValueLens/



    index.html

    styles.css

    color.js

    app.js

    README.md

```



---



## Running the Program



No installation is required.



Simply double-click



```

index.html

```



Your default web browser should open.



If your browser blocks local file access, use Chrome, Edge or Firefox.



---



## How to Use



### Step 1



Click



```

Choose Image

```



and open a photograph.



The photograph can be



- a palette

- a paint mixture

- a painting

- a reference photo



---



### Step 2



Choose an averaging size.



Recommended:



```

5 × 5

```



or



```

9 × 9

```



Averaging several pixels is generally more reliable than reading one pixel.



---



### Step 3



Click anywhere on the image.



The program displays



```

Painter's Value



L*



a*



b*



RGB



Hex

```



---



### Step 4 (Optional)



Enter the value you intended to mix.



Example



```

6.0

```



The program will report



```

On target



Too light



Too dark

```



---



## Understanding Painter's Value



This prototype estimates value using CIELAB L*.



```

L* = 0

```



corresponds to black.



```

L* = 100

```



corresponds to white.



The prototype maps this onto a continuous



```

1–10

```



Painter's Value.



This is **not** a true Munsell measurement.



It is an estimate intended to help compare paint mixtures consistently.



---



## Limitations



This program measures a photograph.



It does **not** measure the paint itself.



Results depend upon



- camera exposure

- white balance

- reflections

- glare

- lighting

- shadows



For best results



- photograph in open shade or north light

- avoid direct sunlight

- avoid glare

- avoid specular reflections

- photograph square to the palette



---



## Future Improvements



### Version 2



Multiple sample points



```

Sky      8.2



Trees    4.1



Road     5.8

```



---



### Version 3



Automatic Value Map



Replace the image with a value-only representation.



This will make value masses immediately obvious.



---



### Version 4



Calibration



Photograph a standard value scale.



The software will learn your camera and lighting.



Future readings will be based on your own calibration.



---



### Version 5



Live Camera Mode



Point your iPhone at a paint pile.



Tap the screen.



Instantly display Painter's Value.



No photograph required.



---



## Known Issues



This is an early prototype.



The current Painter's Value uses a simple linear conversion from CIELAB L*.



Future versions will use a calibrated conversion that better matches artists' perception of value.



---



## License



This prototype is intended for personal and educational use.



---



## Acknowledgements



Developed collaboratively by



Ron Downer



and



ChatGPT



with the goal of creating a practical studio tool for oil painters.

