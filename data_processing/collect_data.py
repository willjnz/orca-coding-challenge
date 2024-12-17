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

# Define a function to parse the KMZ and extract the bathymetry data
def extract_kmz(kmz_path):
    with zipfile.ZipFile(kmz_path, 'r') as kmz:
        kmz.extractall('temp_kmz')
    # The KMZ file contains KML, which is XML format
    kml_file = 'temp_kmz/doc.kml'  # KMZ contains a KML file named doc.kml
    with open(kml_file, 'r') as file:
        kml_content = file.read()
    tree = ET.ElementTree(ET.fromstring(kml_content))
    root = tree.getroot()
    # Extract relevant bathymetry data here (you need to adjust for your specific XML structure)
    # This will vary based on the structure of your KML file
    coordinates = []
    for coord in root.iter('.//coordinates'):
        coords = coord.text.strip().split()
        for c in coords:
            lon, lat, depth = c.split(',')
            coordinates.append((float(lon), float(lat), float(depth)))
    return coordinates

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

# Database connection parameters (adjust as needed)
db_params = {
    'dbname': 'your_database_name',
    'user': 'your_database_user',
    'password': 'your_database_password',
    'host': 'localhost',  # Replace with your PostGIS host
    'port': '5432'        # Default PostgreSQL port
}

# Define the table name where we will store the contours
table_name = 'your_postgis_table_name'

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

    # Step 3: Find the KMZ file (adjust the logic based on your ZIP contents)
    kmz_file = os.path.join('unzipped_files', 'IC_03_T10_20241205_CS_TIN.kmz')  # Adjust for each file
    bathymetry_data = extract_kmz(kmz_file)

    # Step 4: Generate smooth depth contours
    contours = generate_contours(bathymetry_data, depth_intervals)

    # Step 5: Insert contours into PostGIS database
    insert_contours_into_postgis(contours, table_name, db_params)

# Clean up (optional)
# os.rmdir('unzipped_files')  # Remove unzipped folder if you want to clean up
# os.rmdir('downloads')  # Remove downloads folder if you want to clean up
