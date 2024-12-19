# Introduction
The challenge is documented in Instructions.md. Here is my implementation:



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


#### Tool choices and rationale:
 - I am aiming to make a pipeline and architecture that completes the task well and is simple to set up. I am using a mix of tools, that are running locally, and without any consideration for security. Once deployed, security would be of upmost importance. GDAL is simple to use and extremely powerful so it does the main processing.

 - I have output depth isoline polylines. These could simply be converted to polygons if needed (we would need to account for the edges of the AOI because these will cut polygons).

#### Strategies for optimizing processing workflows:
- Apache Airflow is ideal for automating data processing pipelines. It can manage complex data workflows. It allows for the orchestration of tasks.
- Containerise \data_processing\main.py for dependency management.
- Move Away from GDAL Shell Commands and Use Python Packages. This allows for more intense analysis, simplifies the pipeline, and ensures better error handling and debugging.
- Run PostgreSQL in Another Docker Container. This provides the flexibility to scale and configure the database independently. Resource allocation, and backup/recover are made simpler.
- Leverage PostGIS Functions for Geospatial Processing: I am already simplifying using PostGIS. If we had to do queries or joins then we should definitely use PostGIS.
- Batch processing with Airflow: batch processing is necessary because the bathymetry can only be downloaded for a certain maximum AOI size. We must break the processing of large bathymetry datasets into smaller, discrete tasks. For example, you can split the dataset by geographical regions, or depth ranges, and then process each batch separately.
- Parallel Execution: whether using Airflow or not, executing multiple tasks in parallel, should significantly speed up processing when dealing with large datasets. For example, you can process different regions or depth layers concurrently.
- Batch processing with PostgreSQL: Use SQL to handle large data volumes in batches. This can be done by processing data in chunks, running batch jobs that process records in smaller pieces, and updating the status of each batch. This prevents the processing pipeline from overloading the system when working with large datasets.
- Add Data Validation and Logging.
- Add Automated Testing. Unit and Integration tests.
- Check if the data has already been processed, so that time is not wasted reprocessing (especially when debugging)



# Setup:
Follow these steps in order.

## PostgreSQL

1. Install locally, add PostGIS extension.

> CREATE EXTENSION postgis;

  

## Pipeline

1. Install Python and OSGEO4W.

2. Add "C:\OSGeo4W64\bin" to PATH so gdal is available in subprocess

3. Run

> pip install -r requirements.txt

4. Run main.py

  

#### More information:

To source the data manually, or define your AOI, you can go here: https://www.ncei.noaa.gov/maps/grid-extract/

1. The data can be automatically downloaded from here. The bounding box can be updated for the desired AOI. This is almost the largest AOI possible in one batch.
>https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?bbox=-131.79583,37.87750,-124.29583,43.89500&bboxSR=4326&size=9000,7221&imageSR=4326&format=tiff&nodata=0&pixelType=F32&interpolation=+RSP_NearestNeighbor&compression=LZ77&renderingRule={%22rasterFunction%22:%22none%22}&f=image
2. The bathymetry data is a GeoTiff, in 4326, has only one band, and values are in meters. cell size is about 90m.
3. Smoothing is done using gdal_warp to prevent contour lines from being jagged. Smoothing is a balance between contour lines looking nice, and losing too much data precision. Although some artifacts in the data would be nice to lose e.g. where it spikes from -40m to -10000.
4. contours are created with gdal_contour. This is an awesome tool for this purpose because an interval can be specified, and it can write directly to PostGIS.


## Tile Server

1. Update pg_hba.conf to allow the Docker network's IP range

2. Install Docker

3. Pull the Docker image:
> docker pull ghcr.io/developmentseed/tipg:uvicorn-latest

5. Run the Docker container:
> docker run -d -p 8081:80 --env POSTGRES_HOST=host.docker.internal --env POSTGRES_PORT=5432 --env POSTGRES_USER=postgres --env POSTGRES_PASS=postgres --env POSTGRES_DB=postgres ghcr.io/developmentseed/tipg:uvicorn-latest

  

## Frontend Map Application
-Vite.js, React, Typescript, Mapbox GL JS application. Displays vector tiles from tipg.

1. Run:
> cd application
> npm install
> yarn run dev
