1. go here: https://www.ncei.noaa.gov/maps/grid-extract/, select Multibeam mosaic, and AOI, download data.
2. Get data automatically from here:
https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?f=image&bbox=-13515556.908056526%2C4099961.5273054326%2C-13352898.91186575%2C4265371.256514474&bboxSR=102100&imageSR=102100&size=532%2C541&format=jpgpng&mosaicRule=%7B%22ascending%22%3Atrue%2C%22mosaicMethod%22%3A%22esriMosaicNorthwest%22%2C%22mosaicOperation%22%3A%22MT_MEAN%22%7D&renderingRule=%7B%22rasterFunction%22%3A%22MultidirectionalHillshadeHaxby_8000-0%22%7D
3. data is geotif, in 4326, has only one band, and values are in meters. cell size is about 90m.
4. run this to smooth the raster: 
   gdalwarp -r bilinear -tr 0.0033334 0.0033334 "C:\aaaWork\orca\orca-coding-challenge\data_processing\exportImage (3).tiff" "C:\aaaWork\orca\orca-coding-challenge\data_processing\exportImage (3)_smoothed.tiff" -overwrite
<!-- 4. use https://gdal.org/en/stable/programs/gdal_contour.html to make contours to shp: 
    gdal_contour -i 10 -f "ESRI Shapefile" "C:\aaaWork\orca\orca-coding-challenge\data_processing\exportImage_smoothed.tiff" "C:\aaaWork\orca\orca-coding-challenge\data_processing\contours_10.shp" -a depth_m -->
5. use https://gdal.org/en/stable/programs/gdal_contour.html to make contours to postgis: gdal_contour -i 10 -f "PostgreSQL" -a "depth_m" "C:\aaaWork\orca\orca-coding-challenge\data_processing\exportImage_smoothed.tiff" PG:"host=localhost user=postgres dbname=postgres password=postgres" -nln "bathymetry_contours"







4.  docker build -t orca-data-processing .
docker run -it --rm orca-data-processing



<!-- Document tool choices and rationale in the README.! -->

<!-- Provide basic documentation in the form of a README file with clear setup and execution instructions (dependencies, database setup, configs, etc.).
Include strategies (if applicable) for optimizing processing workflows (e.g., leveraging PostGIS functions, batch processing). -->