<!-- ##### install mdal
conda install -c conda-forge mdal-python
pip install mdal -->


docker build -t mdal-pipeline .

docker run -v /:/app mdal-pipeline
<!-- this command mounts your local directory to the /app directory in the container, allowing you to manage files easily on your local machine while running everything inside the container. -->

### Data formats:
- Can't use https://gdal.org/en/stable/drivers/raster/xyz.html because the .xyz is ungridded.
- I need this to convert the Esri TIN to Raster https://pro.arcgis.com/en/pro-app/latest/tool-reference/3d-analyst/tin-to-raster.htm. mdal supports Esri TIN but doesn't output to a raster.
- Therefore I make the raster myself from the survey points

## Workflow 
1. interpolate raster grid from survey points
> gdal_grid -l SurveyPoint -zfield Z_depth -a invdistnn:power=2.0:smoothing=200.0:radius=180.0:max_points=8:min_points=0:nodata=0.0 -ot Float32 -of GTiff "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/CF_14_DEC_20240909_CS.gdb" "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/bathymetry.tif"
2. smooth raster. bilinear smoothes better.
> gdalwarp -overwrite -t_srs EPSG:4326 -tr 3.3e-07 3.3e-07 -r bilinear -of GTiff "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/bathymetry.tif" "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/bathymetry_smoothed.tif"
1. clip to survey job polygon
> gdalwarp -overwrite -t_srs EPSG:4326 -of GTiff -cutline "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/CF_14_DEC_20240909_CS.gdb" -cl SurveyJob -crop_to_cutline "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/bathymetry_smoothed.tif" "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/bathymetry_clipped.tif"
1. create contours
> gdal_contour -b 1 -a depth_m -i 10.0 -f "Parquet" "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/bathymetry_clipped.tif" "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/contours_10m.parquet"
1. simplify lines
> ogr2ogr -f "ESRI Shapefile" output.shp input.shp -simplify 0.5

> {
  "area_units": "m2",
  "distance_units": "meters",
  "ellipsoid": "EPSG:7030",
  "inputs": {
    "INPUT": "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/contours_1m.parquet",
    "METHOD": 2,
    "OUTPUT": "TEMPORARY_OUTPUT",
    "TOLERANCE": 0.0001
  }
}
1. smooth lines
   >{ 'INPUT' : 'C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/contours_simplified.parquet|layername=contours_simplified', 'ITERATIONS' : 5, 'MAX_ANGLE' : 180, 'OFFSET' : 0.25, 'OUTPUT' : 'TEMPORARY_OUTPUT' }


   from shapely.geometry import LineString
from shapely.ops import transform
import numpy as np

# Chaikin's corner-cutting algorithm
def smooth_line(line, iterations=2):
    for _ in range(iterations):
        coords = list(line.coords)
        new_coords = []
        for i in range(len(coords) - 1):
            p1 = coords[i]
            p2 = coords[i + 1]
            new_coords.append((0.75 * p1[0] + 0.25 * p2[0], 0.75 * p1[1] + 0.25 * p2[1]))
            new_coords.append((0.25 * p1[0] + 0.75 * p2[0], 0.25 * p1[1] + 0.75 * p2[1]))
        line = LineString(new_coords)
    return line

# Example: Smooth a simple LineString
original_line = LineString([(0, 0), (1, 2), (2, 2), (3, 0)])
smoothed_line = smooth_line(original_line, iterations=2)

print("Original:", list(original_line.coords))
print("Smoothed:", list(smoothed_line.coords))


2. simplify?
3. use this https://github.com/MathiasGroebe/Smooth-Contours, or this https://hkartor.se/anteckningar/contour_lines_script.html

## trial 0
1. open tin in QGIS
2. run "Export Contours" on mesh (this creates basically the same jagged contours as USACE provide)
3. smooth lines. this is a minor improvement. it would be better to make the TIN a raster, and then smooth that raster and then make contours and then smooth those.
4. 


{
  "area_units": "m2",
  "distance_units": "meters",
  "ellipsoid": "EPSG:7030",
  "inputs": {
    "CONTOUR_LEVEL_LIST": "",
    "CRS_OUTPUT": "EPSG:4326",
    "DATASET_GROUPS": [
      0
    ],
    "DATASET_TIME": {
      "type": "static"
    },
    "INCREMENT": 5.0,
    "INPUT": "ESRI_TIN:\"C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/CF_14_DEC_20240909_CS_tin/tdenv9.adf\"",
    "MAXIMUM": 7000.0,
    "MINIMUM": 0.0,
    "OUTPUT_LINES": "TEMPORARY_OUTPUT",
    "OUTPUT_POLYGONS": "TEMPORARY_OUTPUT"
  }
}


processing.run("native:meshcontours", {'INPUT':'ESRI_TIN:"C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/CF_14_DEC_20240909_CS_tin/tdenv9.adf"','DATASET_GROUPS':[0],'DATASET_TIME':{'type': 'static'},'INCREMENT':5,'MINIMUM':0,'MAXIMUM':7000,'CONTOUR_LEVEL_LIST':'','CRS_OUTPUT':QgsCoordinateReferenceSystem('EPSG:4326'),'OUTPUT_LINES':'TEMPORARY_OUTPUT','OUTPUT_POLYGONS':'TEMPORARY_OUTPUT'})



{
  "area_units": "m2",
  "distance_units": "meters",
  "ellipsoid": "EPSG:7030",
  "inputs": {
    "INPUT": "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/contours_1m.geojson",
    "ITERATIONS": 2,
    "MAX_ANGLE": 180.0,
    "OFFSET": 0.25,
    "OUTPUT": "TEMPORARY_OUTPUT"
  }
}

processing.run("native:smoothgeometry", {'INPUT':'C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/processing/contours_1m.geojson','ITERATIONS':2,'OFFSET':0.25,'MAX_ANGLE':180,'OUTPUT':'TEMPORARY_OUTPUT'})




## trial 1
1. convert CF_14_DEC_20240909_CS_SurveyPoint.kmz to shapefile
2. 
Path






## other

gdal_grid -a invdist:power=2.0:smoothing=1.0 -zfield depth_m -ot Float32 -of GTiff -txe -86.520958416 -86.504837755 -tye 30.370675751 30.407345804 -outsize 1000 1000 "C:/path/to/points.shp" "C:/path/to/output_raster.tif"


good file:
CF_14_DEC_20240909_CS

process:
mdal to go from Esri TIN to 2DM
numpy,gdal,rasterio 2DM to 


don't use Esri tin because it is a horrible format?
make raster from points


gdal_rasterize -l "Sounding Points" -a depth_m -tr 0.0001 0.0001 -a_nodata 0.0 -te -86.520958416 30.370675751 -86.504837755 30.407345804 -ot Float32 -of GTiff "C:/Users/William Jones/Downloads/CESAM_PMC_CF_14_DEC_20240909_CS/CF_14_DEC_20240909_CS_SurveyPoint.kmz" "C:/Users/William Jones/AppData/Local/Temp/processing_KfIXGt/b20c6e9d7f3b4baf97a3d2bad90cc991/OUTPUT.tif"