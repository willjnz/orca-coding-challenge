import requests
import zipfile
import os
import subprocess
import psycopg2

def download_and_unzip(url, output_dir):
    """
    Downloads a ZIP file from the provided URL and unzips it into the specified directory.
    
    Args:
        url (str): URL to the ZIP file.
        output_dir (str): Directory where the contents of the ZIP file should be extracted.
    """
    # Make sure the output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Download the ZIP file
    print(f"Downloading file from {url}...")
    response = requests.get(url)
    
    # Check if the download was successful
    if response.status_code == 200:
        zip_filename = os.path.join(output_dir, "downloaded_file.zip")
        
        # Save the ZIP file locally
        with open(zip_filename, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded successfully to {zip_filename}")
        
        # Unzip the file
        print(f"Unzipping file to {output_dir}...")
        with zipfile.ZipFile(zip_filename, 'r') as zip_ref:
            zip_ref.extractall(output_dir)
        print(f"Unzipped successfully to {output_dir}")
        
        # Optional: Remove the downloaded ZIP file after extraction
        os.remove(zip_filename)
        print(f"Deleted the downloaded ZIP file {zip_filename}")
    else:
        print(f"Failed to download file. Status code: {response.status_code}")


def convert_gdb_layer_to_geoparquet(input_gdb, output_file, layer_name):
    """
    Convert a specific layer from a GDB file to GeoParquet format.
    
    Args:
        input_gdb (str): Path to the input GDB file.
        output_file (str): Path to the output GeoParquet file.
        layer_name (str): The name of the layer to convert.
    """
    # Build the ogr2ogr command for a specific layer
    command = [
        "ogr2ogr",                      # ogr2ogr tool
        "-f", "Parquet",             # Output format (GeoParquet)
        output_file,                    # Output GeoParquet file path
        input_gdb,                      # Input GDB file path
        layer_name                      # Specify the layer to convert
    ]
    
    # Run the command
    try:
        subprocess.run(command, check=True)
        print(f"Layer '{layer_name}' successfully converted to {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running ogr2ogr: {e}")

def convert_gdb_to_geoparquet(input_gdb, output_dir, layers):
    """
    Convert specific layers from a GDB file to GeoParquet format.
    
    Args:
        input_gdb (str): Path to the input GDB file.
        output_dir (str): Path to the output directory.
        layers (list): List of layer names to convert (e.g., ['SurveyJob', 'SurveyPoint']).
    """
    for layer in layers:
        output_file = f"{output_dir}/{layer}.parquet"
        convert_gdb_layer_to_geoparquet(input_gdb, output_file, layer)
        

def interpolate_raster_from_survey_points(input_file, output_raster, layer_name="SurveyPoint", zfield="Z_depth"):
    """
    Interpolates a raster grid from survey points using gdal_grid.
    
    Args:
        input_file (str): Path to the input vector file (GeoParquet or GDB).
        output_raster (str): Path to the output raster file (e.g., .tif).
        layer_name (str): Name of the layer to use for interpolation (default is "SurveyPoint").
        zfield (str): Name of the field in the vector data to use for Z-values (default is "Z_depth").
    """
    # Build the gdal_grid command
    command = [
        "gdal_grid",                             # GDAL grid command
        "-l", layer_name,                        # Layer name (SurveyPoint)
        "-zfield", zfield,                       # Field to use for Z-values (e.g., "Z_depth")
        "-a", "invdistnn:power=2.0:smoothing=200.0:radius=180.0:max_points=8:min_points=0:nodata=0.0",  # Inverse distance algorithm
        "-ot", "Float32",                        # Output data type (32-bit float)
        "-of", "GTiff",                          # Output format (GeoTIFF)
        input_file,                              # Input vector file (GeoParquet or GDB)
        output_raster                            # Output raster file path
    ]
    
    # Run the command
    try:
        subprocess.run(command, check=True)
        print(f"Raster grid successfully interpolated and saved to {output_raster}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running gdal_grid: {e}")


# Smooth the raster using gdalwarp
def smooth_raster_and_reproject_to_4326(input_file, output_file):
    print("Starting to smooth the raster.")
    command = [
        "gdalwarp",
        "-r", "bilinear",
        "-tr", "0.000001", "0.000001",
        "-t_srs", "EPSG:4326",
        input_file,
        output_file,
        "-overwrite"
    ]
    subprocess.run(command, check=True)
    print(f"Raster smoothed: {output_file}")


def clip_raster_to_parquet(input_raster, output_raster, cutline_file):
    """
    Clips a raster using a polygon from a GeoParquet file (SurveyJob.parquet) using gdalwarp.

    Args:
        input_raster (str): Path to the input raster file (e.g., bathymetry_smoothed.tif).
        output_raster (str): Path to the output clipped raster file (e.g., bathymetry_clipped.tif).
        cutline_file (str): Path to the GeoParquet file (e.g., SurveyJob.parquet).
    """
    # Build the gdalwarp command for clipping the raster with the GeoParquet cutline
    command = [
        "gdalwarp",                             # gdalwarp command
        "-overwrite",                           # Overwrite the output if it exists
        "-t_srs", "EPSG:4326",                  # Target spatial reference system (EPSG:4326)
        "-of", "GTiff",                         # Output format (GeoTIFF)
        "-cutline", cutline_file,               # Input GeoParquet file to use for clipping
        "-crop_to_cutline",                     # Crop the raster to the cutline
        input_raster,                           # Input raster file (bathymetry_smoothed.tif)
        output_raster                           # Output clipped raster file (bathymetry_clipped.tif)
    ]
    
    # Run the command
    try:
        subprocess.run(command, check=True)
        print(f"Raster successfully clipped and saved to {output_raster}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running gdalwarp: {e}")


# Clean up old table
def drop_table_if_exists(interval, conn):
    """
    Drop a table if it exists in the PostGIS database.
    """
    table_name = f"bathymetry_contours_{interval}"
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = %s) THEN
                    EXECUTE 'DROP TABLE ' || quote_ident(%s) || ' CASCADE';
                END IF;
            END;
            $$ LANGUAGE plpgsql;
            """, (table_name, table_name))
            conn.commit()
            print(f"Table {table_name} dropped if it existed.")
    except Exception as e:
        print(f"Error while dropping table {table_name}: {e}")


# make vector contours at a given interval (meters), and write them to a postgis table
def generate_contours_and_write_to_postgis(input_file, interval, conn, postgis_connection):
    """
    Generate contours and write them to PostGIS.
    """
    print("Starting to smooth generate contours.")
    output_layer = f"bathymetry_contours_{interval}"
    command = [
        "gdal_contour",
        "-i", str(interval/100),  # Interval of contours in meters
        "-f", "PostgreSQL",  # Output format
        "-a", "depth_m",  # Attribute name for depth
        input_file,
        f"PG:{postgis_connection}",
        "-nln", output_layer
    ]
    subprocess.run(command, check=True)
    print(f"Contours generated and saved to PostGIS: {output_layer}")


# simplify the vector contours so they are smoother, and lighter to load on the frontend
def simplify_lines(interval, conn, tolerance=0.0000045):
    """
    Simplify the vector lines in the PostGIS table to about 0.5m (0.0000045 degrees at the equator).
    """
    print("Starting to simplify contours.")
    table_name = f"bathymetry_contours_{interval}"
    
    try:
        sql = f"""
        UPDATE {table_name}
        SET wkb_geometry = ST_Simplify(wkb_geometry, {tolerance})
        WHERE ST_NumPoints(wkb_geometry) > 2;  -- Only apply to geometries with more than 2 points
        """
        
        with conn.cursor() as cursor:
            cursor.execute(sql)
            conn.commit()
            print(f"Lines in table {table_name} simplified to {tolerance} meters.")
    
    except Exception as e:
        print(f"Error while simplifying lines in table {table_name}: {e}")


# add a spatial index to a table so that they can be queried faster
def add_spatial_index(interval, conn):
    """
    Add a spatial index to the generated contours layer in PostGIS.
    """
    print("Starting to add spatial index.")
    output_layer = f"bathymetry_contours_{interval}"
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE INDEX ON {output_layer} USING GIST (wkb_geometry);")
            conn.commit()
            print(f"Spatial index created on {output_layer}.")
    except Exception as e:
        print(f"Error while creating spatial index on {output_layer}: {e}")


# the main flow of the pipeline
def main():
    print("Starting pipeline.")
    # Set up parameters
    url = "https://ehydroprod.blob.core.usgovcloudapi.net/ehydro-surveys/CENWS/CENWS_DIS_GH_10_WHCX_20240717_CS_E_5_12_614.ZIP"
    survey_name = "GH_10_WHCX_20240717_CS_E_5_12_614"
    # raw_image_file = "exportImage.tiff"
    # smoothed_raster_file = "bathymetry_smoothed.tiff"
    # postgis_connection = "host=localhost user=postgres dbname=postgres password=postgres"
    # contour_intervals = [50, 100, 500, 100000] # this is in centimeters so that table names don't have decimals


    output_dir = "C:/Users/William Jones/Downloads"

    download_and_unzip(url, output_dir)
    
    input_gdb = os.path.join(output_dir, survey_name + ".gdb")
    layers = ["SurveyJob", "SurveyPoint"]  # Layers to convert

    convert_gdb_to_geoparquet(input_gdb, output_dir, layers)
    
    survey_point_file = "C:/Users/William Jones/Downloads/SurveyPoint.parquet"
    interpolated_raster_file = "C:/Users/William Jones/Downloads/bathymetry.tif"
    interpolate_raster_from_survey_points(survey_point_file, interpolated_raster_file)
    
    smoothed_raster_file = "C:/Users/William Jones/Downloads/bathymetry_smoothed.tif"
    smooth_raster_and_reproject_to_4326(interpolated_raster_file, smoothed_raster_file)

    clipped_raster_file = "C:/Users/William Jones/Downloads/bathymetry_clipped.tif"
    cutline_file = "C:/Users/William Jones/Downloads/SurveyJob.parquet"
    clip_raster_to_parquet(smoothed_raster_file, clipped_raster_file, cutline_file)
    
    """
    # Establish a single PostGIS connection
    try:
        conn_params = {}
        for param in postgis_connection.split():
            key, value = param.split("=")
            conn_params[key] = value

        conn = psycopg2.connect(
            dbname=conn_params["dbname"],
            user=conn_params["user"],
            password=conn_params["password"],
            host=conn_params["host"],
            port=conn_params.get("port", 5432)
        )
        print("Connected to PostGIS.")

        # Generate contours and process for each interval
        for interval in contour_intervals:
            drop_table_if_exists(interval, conn)  # Drop the table if it exists
            generate_contours_and_write_to_postgis(smoothed_raster_file, interval, conn, postgis_connection)
            simplify_lines(interval, conn)
            add_spatial_index(interval, conn)  # Add spatial index

        print("Pipeline ran successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("PostGIS connection closed.")
    """


if __name__ == "__main__":
    main()
