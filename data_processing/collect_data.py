"""
# Retrieve a small subset of USACE survey data (e.g., DEM files for a specific region).
# https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CESAJ/CK_01_CKH_20160524_CS_2016_038_05.ZIP

python download a zip file from here:

https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CESAW/CESAW_DIS_IC_03_T10_20241205_CS.ZIP"

unzip it. open the "IC_03_T10_20241205_CS_TIN.kmz" bathymetry layer.




# Process the DEM data to generate smoothed contour polygons at reasonable depth intervals (e.g., 0m, 0.5m, 1m, 2m, 5m, 10m).
# USACE hydro survey data contains DEMs and processed contour polygons. We don’t want their contour polygons as they are jagged in many cases. Come up with a way to produce non-jagged contours from the DEMs.
# Store the processed bathymetry contours in a PostGIS database.


read scraped html to get list of files.
for each file:
    download
    unzip
    get bathymetry data
    create smooth, even depth contour lines.
    insert each as a feature in a postgis table
"""


import os
import requests
import zipfile
import geopandas as gpd
from shapely.geometry import Polygon
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
import psycopg2
from io import BytesIO
from zipfile import ZipFile
from pyproj import Proj, transform
import rasterio
import numpy as np
from rasterio.warp import calculate_default_transform, reproject, Resampling
from scipy.ndimage import gaussian_filter

# Define a function to download the file
def download_file(url, save_path):
    response = requests.get(url)
    if response.status_code == 200:
        with open(save_path, 'wb') as file:
            file.write(response.content)
        print(f"Downloaded: {url}")
    else:
        print(f"Failed to download {url}")

# Define a function to unzip the downloaded file
def unzip_file(zip_path, extract_to):
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    print(f"Unzipped: {zip_path}")

# Define a function to process bathymetry data and create contours
def generate_contours(bathymetry_data, depth_intervals):
    contours = []
    for depth_interval in depth_intervals:
        # Create contour polygons (this is a placeholder, use your contour creation method)
        contour_polygon = Polygon([(0, 0), (0, 1), (1, 1), (1, 0)])  # Example polygon, replace with your logic
        contours.append(contour_polygon)
    return contours

# Define a function to insert contours into PostGIS
def insert_contours_into_postgis(contours, table_name, db_params):
    # Connect to PostGIS database
    conn = psycopg2.connect(
        dbname=db_params['dbname'], 
        user=db_params['user'], 
        password=db_params['password'], 
        host=db_params['host'], 
        port=db_params['port']
    )
    cursor = conn.cursor()

    # Insert contours as features
    for contour in contours:
        wkt = contour.wkt  # Convert contour to Well-Known Text (WKT)
        cursor.execute(f"INSERT INTO {table_name} (geom) VALUES (ST_GeomFromText(%s, 4326))", (wkt,))
    
    # Commit and close connection
    conn.commit()
    cursor.close()
    conn.close()
    print(f"Inserted {len(contours)} contours into {table_name}.")

# Load HTML file and extract download links
with open('scraped_content.html', 'r', encoding='utf-8') as file:
    html_content = file.read()

# Parse the HTML
soup = BeautifulSoup(html_content, 'html.parser')

# Find all download links
download_links = soup.find_all('a', href=True)

db_params = {
    'dbname': 'postgres',
    'user': 'postgres',
    'password': 'postgres',
    'host': 'localhost',
    'port': '5432'
}

# Define the table name where we will store the contours
table_name = 'bathymetry_contours'

# Depth intervals (example: 0m, 0.5m, 1m, 2m, 5m, 10m)
depth_intervals = [0, 0.5, 1, 2, 5, 10]

# Process each file
for link in download_links:
    url = link['href']
    zip_filename = url.split('/')[-1]
    zip_filepath = os.path.join('downloads', zip_filename)

    # Create 'downloads' folder if not exists
    if not os.path.exists('downloads'):
        os.makedirs('downloads')

    # Step 1: Download the ZIP file
    download_file(url, zip_filepath)

    # Step 2: Unzip the downloaded file
    unzip_file(zip_filepath, 'unzipped_files')
    
    raster_filepath = zip_filename.replace('CESAW_DIS_', '').replace('.ZIP', '') + '_tin\\tdenv9.adf'
    
    with rasterio.open(adf_file) as src:
        data = src.read(1)  # Reading the first band
        transform = src.transform
        crs = src.crs
        
    dst_crs = 'EPSG:4326'
    transform, width, height = calculate_default_transform(crs, dst_crs, src.width, src.height, *src.bounds)
    
    # Create an empty destination array
    data_reprojected = np.empty((height, width), dtype=np.float32)
    
    # Reproject the data
    with rasterio.open(
        "reprojected.tif", 'w', driver='GTiff', height=height, width=width, count=1, dtype=data_reprojected.dtype,
        crs=dst_crs, transform=transform
    ) as dst:
        reproject(
            source=(data, crs),
            destination=(data_reprojected, dst_crs),
            src_transform=transform,
            src_crs=crs,
            dst_transform=transform,
            dst_crs=dst_crs,
            resampling=Resampling.nearest
        )

    # Step 4: Generate Smoothed Contour Lines
    # Apply Gaussian smoothing filter
    smoothed_data = gaussian_filter(data_reprojected, sigma=1)
    
    
    # Generate contour lines from smoothed data
import matplotlib.pyplot as plt
from matplotlib import colors

contours = plt.contour(smoothed_data, levels=np.arange(0, smoothed_data.max(), 1), colors='black')
contour_polygons = []

for collection in contours.collections:
    for path in collection.get_paths():
        coords = path.vertices
        contour_polygons.append(Polygon(coords))
    # Step 4: Generate smooth depth contours
    contours = generate_contours(bathymetry_data, depth_intervals)

    # Step 5: Insert contours into PostGIS database
    # insert_contours_into_postgis(contours, table_name, db_params)

# Clean up (optional)
# os.rmdir('unzipped_files')  # Remove unzipped folder if you want to clean up
# os.rmdir('downloads')  # Remove downloads folder if you want to clean up
