### Data formats:
- Can't use https://gdal.org/en/stable/drivers/raster/xyz.html because the USACE .xyz is ungridded.
- Esri TIN cannot be easily converted to raster without ArcGIS Pro. Mdal has a driver, but can't transform it to raster.
- Therefore I will make the raster myself from the survey points.

## Workflow 
1. Interpolate raster grid from survey points. This is the easiest way to get a Geotiff from the provided USACE data. Smooth the output.
2. Smooth raster. bilinear smoothes better. This makes the resulting contour lines smoother
3. clip to survey job polygon
4. Create vector contour lines
5. Simplify lines. this removes jagged parts of lines
6. Smooth lines. this makes the lines smooth after simplification


## Future ideas:
1. investigate using these tools: https://github.com/MathiasGroebe/Smooth-Contours, or https://hkartor.se/anteckningar/contour_lines_script.html
