# Introduction
The challenge is documented in Instructions.md. Here is my implementation:

 #### Tool choices and rationale:
 I am aiming to make a pipeline and architecture that completes the task well and is simple to set up. I am using a mix of tools, that are running locally, and without any consideration for security. GDAL is simple to use and extremely powerful so it does the main 

#### Include strategies (if applicable) for optimizing processing workflows (e.g., leveraging PostGIS functions, batch processing):
- Airflow for orchestration, scheduling, monitoring.
- Containerise \data_processing\main.py so that its dependencies are reliably working. Then move away from GDAL shell commands, and use Python packages instead. 
- Run PostgreSQL in another Docker container.
- 
# Setup:

  

## PostgreSQL

1. Install locally, add PostGIS extension.

> CREATE EXTENSION postgis;

  

## Pipeline

1. Install Python and OSGEO.

2. Add "C:\OSGeo4W64\bin" to PATH so gdal is available in subprocess

3. Run

> pip install -r requirements.txt

4. Run main.py

  

#### More information:

1. To source the data manually, you can go here: https://www.ncei.noaa.gov/maps/grid-extract/

2. The data can be automatically downloaded from here. The bounding box can be updated for the desired AOI.
>https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?f=image&bbox=-13515556.908056526%2C4099961.5273054326%2C-13352898.91186575%2C4265371.256514474&bboxSR=102100&imageSR=102100&size=532%2C541&format=jpgpng&mosaicRule=%7B%22ascending%22%3Atrue%2C%22mosaicMethod%22%3A%22esriMosaicNorthwest%22%2C%22mosaicOperation%22%3A%22MT_MEAN%22%7D&renderingRule=%7B%22rasterFunction%22%3A%22MultidirectionalHillshadeHaxby_8000-0%22%7D
3. The bathymetry data is a GeoTiff, in 4326, has only one band, and values are in meters. cell size is about 90m.
4. Smoothing is done using gdal_warp to prevent contour lines from being jagged. Smoothing is a balance between contour lines looking nice, and losing too much data precision. Although some artifacts in the data would be nice to lose e.g. where it spikes from -40m to -10000.
5. contours are created with gdal_contour. This is an awesome tool for this purpose because an interval can be specified, and it can write directly to PostGIS.


## Tile Server

1. Update pg_hba.conf to allow the Docker network's IP range

2. Install Docker

3. Pull the Docker image:
> docker pull ghcr.io/developmentseed/tipg:uvicorn-latest

5. Run the Docker container:
> docker run -d -p 8081:80 --env POSTGRES_HOST=host.docker.internal --env POSTGRES_PORT=5432 --env POSTGRES_USER=postgres --env POSTGRES_PASS=postgres --env POSTGRES_DB=postgres ghcr.io/developmentseed/tipg:uvicorn-latest

  

## Frontend Map Application

  
  