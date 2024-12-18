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
import matplotlib.pyplot as plt
from matplotlib import colors
# from osgeo import gdal

# gdal.UseExceptions()

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
"""
# Define a function to process bathymetry data and create contours
def generate_contours(smoothed_data, depth_intervals):
    # Create contour lines at 1-meter intervals
    contours = plt.contour(smoothed_data, levels=np.arange(0, smoothed_data.max(), 1), colors='black')
    contour_polygons = []
    
    for collection in contours.collections:
        for path in collection.get_paths():
            coords = path.vertices
            contour_polygons.append(Polygon(coords))
    return contours

# Function to convert Esri Grid (.adf) to GeoTIFF
def convert_adf_to_geotiff(adf_path, geotiff_path):
    # Open the Esri Grid (ADF) file using GDAL
    dataset = gdal.Open(adf_path)
    # if not dataset:
    #     raise Exception(f"Failed to open {adf_path} with GDAL.")
    
    # Use GDAL to save the data into GeoTIFF format
    driver = gdal.GetDriverByName('GTiff')
    
    # Create the GeoTIFF output file
    geotiff_dataset = driver.Create(geotiff_path, dataset.RasterXSize, dataset.RasterYSize, 1, gdal.GDT_Float32)
    geotiff_dataset.SetGeoTransform(dataset.GetGeoTransform())
    geotiff_dataset.SetProjection(dataset.GetProjection())
    
    # Write the raster data to the GeoTIFF file
    geotiff_dataset.GetRasterBand(1).WriteArray(dataset.GetRasterBand(1).ReadAsArray())
    
    # Close the dataset
    dataset = None
    geotiff_dataset = None
    print(f"Converted {adf_path} to GeoTIFF: {geotiff_path}")

# Function to read the raster file using rasterio
def read_raster_with_rasterio(raster_path):
    with rasterio.open(raster_path) as src:
        data = src.read(1)  # Read the first band
        transform = src.transform
        crs = src.crs
    return data, transform, crs

# Function to reproject the raster data
def reproject_raster(data, src_crs, src_transform, dst_crs='EPSG:4326'):
    # Create an empty array for the reprojected data
    dst_transform, width, height = calculate_default_transform(src_crs, dst_crs, data.shape[1], data.shape[0], *src_transform)
    reprojected_data = np.empty((height, width), dtype=np.float32)

    # Perform the reprojection
    reproject(
        source=(data, src_crs),
        destination=(reprojected_data, dst_crs),
        src_transform=src_transform,
        src_crs=src_crs,
        dst_transform=dst_transform,
        dst_crs=dst_crs,
        resampling=Resampling.nearest
    )

    return reprojected_data, dst_transform

# Function to apply Gaussian smoothing to the raster
def smooth_raster(data, sigma=1):
    return gaussian_filter(data, sigma)


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
"""
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
    """
    # Define the file code by stripping unnecessary parts of the filename
    file_code = zip_filename.replace('CESAW_DIS_', '').replace('.ZIP', '')

    # Define the folder where the .adf file is located (assumed it is in a folder named <file_code>_tin)
    adf_foldername = file_code + '_tin'

    # Construct the full path to the folder containing the .adf file
    adf_folder_path = os.path.join('unzipped_files', adf_foldername)

    # Construct the full path to the tdenv9.adf file within the folder
    adf_file = os.path.join(adf_folder_path, 'tdenv9.adf')

    # Step 1: Convert the .adf Esri Grid file to GeoTIFF
    geotiff_path = os.path.join(adf_folder_path, file_code + '.tif')
    convert_adf_to_geotiff(adf_file, geotiff_path)

    
    # Step 2: Read the converted GeoTIFF using rasterio
    data, transform, crs = read_raster_with_rasterio(geotiff_path)
    # kmz_file_path = file_code + '_tin.kmz'
    # kmz_filepath = os.path.join('unzipped_files', kmz_file_path)
    # kmz_filepath_output = os.path.join('unzipped_files', file_code)

    # # Extract the raster from KMZ
    # with zipfile.ZipFile(kmz_filepath, 'r') as kmz:
    #     kmz.extractall(kmz_filepath_output)
    
    # # Find the GeoTIFF file inside the KMZ
    # for file_name in os.listdir(kmz_filepath_output):
    #     if file_name.endswith('.tif'):
    #         raster_filepath = os.path.join(kmz_filepath_output, file_name)
    #         break
    
    # # Step 3: Read the raster data using rasterio
    # with rasterio.open(raster_filepath) as src:
    #     data = src.read(1)  # Reading the first band
    #     transform = src.transform
    #     crs = src.crs
        
    # Step 4: Reproject the raster to EPSG:4326
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

    # Step 5: Generate Smoothed Contour Lines
    # Apply Gaussian smoothing filter
    smoothed_data = gaussian_filter(data_reprojected, sigma=1)
    
    # Step 6: Generate smooth depth contours
    contours = generate_contours(smoothed_data, depth_intervals)

    # Step 7: Insert contours into PostGIS database
    insert_contours_into_postgis(contours, table_name, db_params)

# Clean up (optional)
# os.rmdir('unzipped_files')  # Remove unzipped folder if you want to clean up
# os.rmdir('downloads')  # Remove downloads folder if you want to clean up
"""



"""
import zipfile
import os
from xml.etree import ElementTree as ET
import rasterio
from rasterio.transform import from_bounds
from PIL import Image
import numpy as np

import rasterio
import pyproj


# # Check the PROJ_LIB environment variable
# print("PROJ_LIB:", os.environ.get('PROJ_LIB'))

# # Check the installed version of rasterio and pyproj
# print("Rasterio installed at:", rasterio.__file__)
# print("Pyproj installed at:", pyproj.__file__)

# # Check which PROJ version rasterio and pyproj are using
# print("PROJ_LIB path:", os.environ.get('PROJ_LIB'))
# print("Rasterio PROJ version:", rasterio.proj_version)
# print("Pyproj PROJ version:", pyproj.proj_version)

# # set PROJ_LIB="C:\\aaaWork\\orca\\orca-coding-challenge\\data_processing\\.venv\\Lib\\site-packages\\pyproj\\proj_dir\\share\\proj\\proj.db"
# os.environ['PROJ_LIB'] = "C:\\aaaWork\\orca\\orca-coding-challenge\\data_processing\\.venv\\Lib\\site-packages\\pyproj\\proj_dir\\share\\proj"
# rasterio.show_versions()
# print(pyproj.datadir.get_data_dir())

# # Test pyproj
# proj = pyproj.Proj('epsg:4326')
# print("pyproj version:", pyproj.__version__)

# Print out the proj version and check if it points to the correct database
# print("Rasterio PROJ version:", rasterio.proj_version)
# print("PROJ_LIB path:", os.environ.get('PROJ_LIB'))

# Test if pyproj is working correctly
# proj = pyproj.Proj(init='epsg:4326')
# print(proj)

def extract_kmz(kmz_file, output_dir):
    # Extract KMZ file contents.
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    with zipfile.ZipFile(kmz_file, 'r') as kmz:
        kmz.extractall(output_dir)

def parse_kml(kml_file):
    # Parse KML to extract coordinates and image information.
    tree = ET.parse(kml_file)
    root = tree.getroot()
    namespace = {'kml': 'http://www.opengis.net/kml/2.2'}

    latlon_box = root.find('.//kml:LatLonBox', namespace)
    coordinates = {
        'north': float(latlon_box.find('kml:north', namespace).text),
        'south': float(latlon_box.find('kml:south', namespace).text),
        'east': float(latlon_box.find('kml:east', namespace).text),
        'west': float(latlon_box.find('kml:west', namespace).text),
    }
    image_href = root.find('.//kml:Icon/kml:href', namespace).text
    return coordinates, image_href

def convert_to_geotiff(image_path, coordinates, output_tif_path):
    # Convert the image to GeoTIFF using the provided coordinates.
    # Load image
    image = Image.open(image_path)
    img_array = np.array(image)

    # Get bounds
    west, south, east, north = coordinates['west'], coordinates['south'], coordinates['east'], coordinates['north']
    
    # Calculate transform
    transform = from_bounds(west, south, east, north, img_array.shape[1], img_array.shape[0])

    # Save as GeoTIFF
    with rasterio.open(
        output_tif_path,
        'w',
        driver='GTiff',
        height=img_array.shape[0],
        width=img_array.shape[1],
        count=3,  # Assuming the image has RGB channels
        dtype=img_array.dtype,
        crs="EPSG:4326",  # WGS84 coordinate system
        transform=transform,
    ) as dst:
        if len(img_array.shape) == 3:  # RGB image
            for i in range(3):  # Write each channel
                dst.write(img_array[:, :, i], i + 1)
        else:  # Grayscale image
            dst.write(img_array, 1)
    print(f"GeoTIFF saved to {output_tif_path}")

# Paths
kmz_file_path = 'C:\\aaaWork\\orca\\orca-coding-challenge\\data_processing\\unzipped_files\\IC_03_T10_20241205_CS_TIN.kmz'  # Path to your KMZ file
output_dir = 'C:\\aaaWork\\orca\\orca-coding-challenge\\data_processing'  # Directory to store extracted contents
kml_file = os.path.join(output_dir, 'doc.kml')
image_path = os.path.join(output_dir, 'Layer0.png')
output_tif_path = 'output_image.tif'

# Extract and process
extract_kmz(kmz_file_path, output_dir)
coordinates, image_href = parse_kml(kml_file)
print(f"Coordinates: {coordinates}")
print(f"Image File: {image_href}")

# Convert to GeoTIFF
convert_to_geotiff(image_path, coordinates, output_tif_path)
"""