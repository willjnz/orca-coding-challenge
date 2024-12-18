import os
import requests
import subprocess
import geopandas as gpd
from sqlalchemy import create_engine

# Step 1: Download the ZIP file
url = 'https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CENWS/CENWS_DIS_SZ_01_HMBX_20240610_CS_E_5_16_61.ZIP'
zip_file_path = '/app/data/data.zip'

response = requests.get(url)
with open(zip_file_path, 'wb') as f:
    f.write(response.content)

# Step 2: Unzip the folder
unzip_dir = '/app/data'
os.makedirs(unzip_dir, exist_ok=True)
subprocess.run(['unzip', zip_file_path, '-d', unzip_dir])

# Step 3: Use MDAL to transform the Esri TIN to GeoTIFF
tin_file = os.path.join(unzip_dir, 'SZ_01_HMBX_20240610_CS_E_5_16_61_tin', 'tdenv9.adf')
output_tif = '/app/data/output.tif'
subprocess.run(['mdal_translate', '-of', 'GTiff', '-tr', '1', '1', f'ESRI_TIN:{tin_file}', output_tif])

# Step 4: Use GDAL to smooth the raster (example using a Gaussian filter)
smoothed_tif = '/app/data/smoothed_output.tif'
subprocess.run(['gdal_translate', '-of', 'GTiff', '-a_srs', 'EPSG:4326', output_tif, smoothed_tif])

# Step 5: Generate contours from the smoothed raster and write to PostGIS
# Generate contours using GDAL
contour_shp = '/app/data/contours.shp'
subprocess.run(['gdal_contour', '-i', '1', smoothed_tif, contour_shp])

# Step 6: Load contours to PostGIS
# Define connection string for PostGIS
postgres_url = 'postgresql://user:password@localhost:5432/dbname'
engine = create_engine(postgres_url)

# Load the shapefile to PostGIS
contours = gpd.read_file(contour_shp)
contours.to_postgis('contours', engine, if_exists='replace', index=False)

print("Process completed successfully.")
