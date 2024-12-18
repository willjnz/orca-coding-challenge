# Setup:

## PostgreSQL
1. Install locally, add PostGIS extension.

## Pipeline
1. Install Python and OSGEO.
2. Add "C:\OSGeo4W64\bin" to PATH so gdal is available in subprocess
3. Run pip install -r requirements.txt
4. Run main.py

More information:
1. To source the data manually, you can go here: https://www.ncei.noaa.gov/maps/grid-extract/
2. Automatically the data can be downloaded from here. The bounding box can be updated for the desired AOI. https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?f=image&bbox=-13515556.908056526%2C4099961.5273054326%2C-13352898.91186575%2C4265371.256514474&bboxSR=102100&imageSR=102100&size=532%2C541&format=jpgpng&mosaicRule=%7B%22ascending%22%3Atrue%2C%22mosaicMethod%22%3A%22esriMosaicNorthwest%22%2C%22mosaicOperation%22%3A%22MT_MEAN%22%7D&renderingRule=%7B%22rasterFunction%22%3A%22MultidirectionalHillshadeHaxby_8000-0%22%7D
3. data is a GeoTiff, in 4326, has only one band, and values are in meters. cell size is about 90m.

## Tile Server


## Frontend Map Application








4.  docker build -t orca-data-processing .
docker run -it --rm orca-data-processing



<!-- Document tool choices and rationale in the README.! -->

<!-- Provide basic documentation in the form of a README file with clear setup and execution instructions (dependencies, database setup, configs, etc.).
Include strategies (if applicable) for optimizing processing workflows (e.g., leveraging PostGIS functions, batch processing). -->