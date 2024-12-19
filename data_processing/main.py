import requests
import zipfile
import os
import subprocess
import psycopg2
import pandas as pd
import geopandas as gpd


def get_surveys(bbox, start_date):
    url = "https://services7.arcgis.com/n1YM8pTrFmm7L4hs/arcgis/rest/services/eHydro_Survey_Data/FeatureServer/0/query"
    
    where_clause = f"SurveyDateStart >= '{start_date}'"
    
    params = {
        'where': where_clause,
        'geometry': f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        'geometryType': 'esriGeometryEnvelope',
        'spatialRel': 'esriSpatialRelIntersects',
        'distance': 0.0,
        'units': 'esriSRUnit_Meter',
        'returnGeodetic': 'false',
        'outFields': 'sourcedatalocation',
        'returnGeometry': 'false',
        'returnCentroid': 'false',
        'returnEnvelope': 'false',
        'featureEncoding': 'esriDefault',
        'multipatchOption': 'xyFootprint',
        'applyVCSProjection': 'false',
        'returnIdsOnly': 'false',
        'returnUniqueIdsOnly': 'false',
        'returnCountOnly': 'false',
        'returnExtentOnly': 'false',
        'returnQueryGeometry': 'false',
        'returnDistinctValues': 'false',
        'cacheHint': 'false',
        'returnZ': 'false',
        'returnM': 'false',
        'returnTrueCurves': 'false',
        'returnExceededLimitFeatures': 'true',
        'sqlFormat': 'none',
        'f': 'pjson'
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"Error querying ArcGIS FeatureServer: {e}")
        return None


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
    print(f"Downloading file from {url}")
    response = requests.get(url)
    
    # Check if the download was successful
    if response.status_code == 200:
        zip_filename = os.path.join(output_dir, "downloaded_file.zip")
        
        # Save the ZIP file locally
        with open(zip_filename, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded successfully to {zip_filename}")
        
        # Unzip the file
        print(f"Unzipping file to {output_dir}")
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
    command = [
        "ogr2ogr",
        "-f", "Parquet",
        output_file,
        input_gdb,
        layer_name
    ]
    
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
    command = [
        "gdal_grid",
        "-l", layer_name,
        "-zfield", zfield,
        "-a", "invdistnn:power=2.0:smoothing=200.0:radius=180.0:max_points=8:min_points=0:nodata=0.0",  # Inverse distance algorithm with smoothing
        "-ot", "Float32",
        "-of", "GTiff",
        input_file,
        output_raster 
    ]
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
        # "-tr", "0.0001", "0.0001", # DEBUGGING
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
    command = [
        "gdalwarp",
        "-overwrite",
        "-t_srs", "EPSG:4326",
        "-of", "GTiff",
        "-cutline", cutline_file, 
        "-crop_to_cutline",
        input_raster,
        output_raster
    ]
    
    try:
        subprocess.run(command, check=True)
        print(f"Raster successfully clipped and saved to {output_raster}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running gdalwarp: {e}")


def generate_contours(input_file, interval, survey_output):
    """
    Generate contours from a raster and write them to a Parquet file.
    """
    output_file = os.path.join(survey_output, f"bathymetry_contours_{interval}.parquet")
    print(f"Starting to generate contours and save to {output_file}.")
    
    command = [
        "gdal_contour",
        "-i", str(interval / 100),  # Interval of contours in meters (e.g., 0.1 for 10 cm)
        "-b", "1",
        "-f", "Parquet",
        "-a", "depth_m",  # Attribute name in the output
        input_file,
        output_file
    ]
    
    try:
        subprocess.run(command, check=True)
        print(f"Contours generated and saved to Parquet: {output_file}")
    except subprocess.CalledProcessError as e:
        print(f"Error occurred while running gdal_contour: {e}")


# for each interval, write a combined parquet, that contains all surveys. then for each interval write the combined parquet to postgis
def collect_parquets_and_write_postgis(survey_names, output_dir, intervals, postgis_connection):
    """
    For each interval, combine Parquet files from all surveys, write a combined Parquet file, 
    and then write it to a PostGIS table.

    Args:
        survey_names (list): List of survey names.
        output_dir (str): Directory containing survey folders.
        intervals (list): List of intervals (e.g., [100, 200]).
        postgis_connection (str): Connection string for PostGIS (e.g., 'host=localhost dbname=postgres user=postgres password=postgres').
    """
    for interval in intervals:
        combined_gdf = []

        # Combine GeoParquet files for the current interval
        for survey_name in survey_names:
            survey_output = os.path.join(output_dir, survey_name)
            parquet_file = os.path.join(survey_output, f"bathymetry_contours_{interval}.parquet")
            if os.path.exists(parquet_file):
                print(f"Reading GeoParquet file: {parquet_file}")
                gdf = gpd.read_parquet(parquet_file)
                combined_gdf.append(gdf)
            else:
                print(f"GeoParquet file not found: {parquet_file}")

        if combined_gdf:
            # Combine all GeoDataFrames into one
            combined_gdf = gpd.GeoDataFrame(pd.concat(combined_gdf, ignore_index=True), crs=gdf.crs)

            # Write the combined GeoParquet file
            combined_parquet_file = os.path.join(output_dir, f"combined_bathymetry_contours_{interval}.parquet")
            combined_gdf.to_parquet(combined_parquet_file)
            print(f"Combined GeoParquet file written to: {combined_parquet_file}")

            # Write the combined GeoParquet to PostGIS using ogr2ogr
            table_name = f"bathymetry_contours_{interval}"
            try:
                command = [
                    "ogr2ogr",
                    "-f", "PostgreSQL",
                    f"PG:{postgis_connection}",
                    combined_parquet_file,
                    "-nln", table_name,
                    "-overwrite"
                ]
                subprocess.run(command, check=True)
                print(f"Data successfully written to PostGIS table: {table_name}")
            except subprocess.CalledProcessError as e:
                print(f"Error writing to PostGIS with ogr2ogr: {e}")
        else:
            print(f"No data found for interval {interval}.")


def simplify_and_smooth_lines_in_postgis(conn, table_name, tolerance=0.000000007, smoothing_iterations=6):
    """
    Simplify and smooth the vector lines in the PostGIS table using ST_SimplifyVW and ST_ChaikinSmoothing.

    Args:
        conn (psycopg2.Connection): Connection to the PostGIS database.
        table_name (str): Name of the PostGIS table containing geometries to process.
        tolerance (float): Tolerance for simplification using ST_SimplifyVW (e.g., 0.000000007 degrees).
        smoothing_iterations (int): Number of iterations for smoothing using ST_ChaikinSmoothing (default is 6).
    """
    print(f"Starting to simplify and smooth contours in table {table_name}.")

    try:
        sql = f"""
        UPDATE {table_name}
        SET geometry = ST_ChaikinSmoothing(
            ST_SimplifyVW(geometry, {tolerance}),
            {smoothing_iterations}
        )
        WHERE ST_NumPoints(geometry) > 2;  -- Only apply to geometries with more than 2 points
        """
        
        with conn.cursor() as cursor:
            cursor.execute(sql)
            conn.commit()
            print(f"Lines in table {table_name} simplified with tolerance {tolerance} "
                  f"and smoothed using {smoothing_iterations} iterations.")
    
    except Exception as e:
        print(f"Error while simplifying and smoothing lines in table {table_name}: {e}")


# add a spatial index to a table so that it can be queried faster
def add_spatial_index(conn, table_name):
    """
    Add a spatial index to the generated contours layer in PostGIS.
    """
    print(f"Starting to add spatial index {table_name}.")
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE INDEX ON {table_name} USING GIST (geometry);")
            conn.commit()
            print(f"Spatial index created on {table_name}.")
    except Exception as e:
        print(f"Error while creating spatial index on {table_name}: {e}")


# TODO: refactor this function so that it can be handled as part of collect_parquets_and_write_postgis 
def write_usace_contours_to_postgis(survey_names, output_dir, postgis_connection):
    """
    Gather all 'ElevationContour_ALL.parquet' files from each survey folder, 
    combine them, and write the combined data to PostGIS table 'usace_contours_100'.

    Args:
        survey_names (list): List of survey names.
        output_dir (str): Directory containing survey folders.
        postgis_connection (str): Connection string for PostGIS (e.g., 'host=localhost dbname=postgres user=postgres password=postgres').
    """
    combined_gdf = []

    # Collect and combine all ElevationContour_ALL.parquet files
    for survey_name in survey_names:
        survey_output = os.path.join(output_dir, survey_name)
        parquet_file = os.path.join(survey_output, "ElevationContour_ALL.parquet")

        if os.path.exists(parquet_file):
            print(f"Reading Parquet file: {parquet_file}")
            gdf = gpd.read_parquet(parquet_file)
            # Ensure the correct geometry column is used
            if 'Shape' in gdf.columns:
                gdf = gdf.rename(columns={'Shape': 'geometry'})
                gdf = gpd.GeoDataFrame(gdf, geometry='geometry')
            combined_gdf.append(gdf)
        else:
            print(f"Parquet file not found: {parquet_file}")

    if combined_gdf:
        # Combine all GeoDataFrames into one
        combined_gdf = gpd.GeoDataFrame(pd.concat(combined_gdf, ignore_index=True), crs=gdf.crs)

        # Write the combined GeoParquet file
        combined_parquet_file = os.path.join(output_dir, "combined_elevation_contours.parquet")
        combined_gdf.to_parquet(combined_parquet_file)
        print(f"Combined GeoParquet file written to: {combined_parquet_file}")

        # Use ogr2ogr to write the combined Parquet to PostGIS
        table_name = "usace_contours_100"
        try:
            command = [
                "ogr2ogr",
                "-f", "PostgreSQL",
                f"PG:{postgis_connection}",
                combined_parquet_file,
                "-nln", table_name,
                "-overwrite"
            ]
            subprocess.run(command, check=True)
            print(f"Data successfully written to PostGIS table: {table_name}")
        except subprocess.CalledProcessError as e:
            print(f"Error writing to PostGIS with ogr2ogr: {e}")
    else:
        print("No data found to combine.")


def main():
    print("Starting pipeline.")

    bbox = (-75.0, 40.0, -74.5, 40.5) # to filter the surveys
    start_date = '2024-01-01' # to filter the surveys
    # start_date = '2024-10-10' # to filter the surveys # just for debugging
    surveys = get_surveys(bbox, start_date)

    if surveys:
        print(surveys)
    else:
        print("No surveys found. Exiting")
        exit()
    
    contour_intervals = [10, 50, 100, 500] # this is in centimeters so that table names don't have decimals
    # contour_intervals = [100, 500] # DEBUGGING
    output_dir = "C:\\aaaWork\\orca"

    postgis_connection = "host=localhost user=postgres dbname=postgres password=postgres"
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
        
        survey_names = [] # this list will be used to join the surveys into a single dataset
        # download each survey and process them, then merge all vectors and then write them to postgres as a single table.
        for survey in surveys["features"]:
            url = survey["attributes"]["sourcedatalocation"]
            survey_name = url.split("/")[-1].replace(".ZIP", "").replace("CENAP_DIS_", "")
            survey_names.append(survey_name)
            
            survey_output = os.path.join(output_dir, survey_name)
            
            download_and_unzip(url, survey_output)
        
            input_gdb = os.path.join(survey_output, survey_name + ".gdb")
            layers = ["SurveyJob", "SurveyPoint", "ElevationContour_ALL"]

            convert_gdb_to_geoparquet(input_gdb, survey_output, layers)
        
            survey_point_file = os.path.join(survey_output, "SurveyPoint.parquet")
            interpolated_raster_file =  os.path.join(survey_output, "bathymetry.tif")
            interpolate_raster_from_survey_points(survey_point_file, interpolated_raster_file)
            
            smoothed_raster_file =  os.path.join(survey_output, "bathymetry_smoothed.tif")
            smooth_raster_and_reproject_to_4326(interpolated_raster_file, smoothed_raster_file)

            clipped_raster_file = os.path.join(survey_output, "bathymetry_clipped.tif")
            cutline_file = os.path.join(survey_output, "SurveyJob.parquet")
            clip_raster_to_parquet(smoothed_raster_file, clipped_raster_file, cutline_file)

            for interval in contour_intervals:
                generate_contours(clipped_raster_file, interval, survey_output)

        collect_parquets_and_write_postgis(survey_names, output_dir, contour_intervals, postgis_connection)

        for interval in contour_intervals:
            table_name = f"bathymetry_contours_{interval}"
            simplify_and_smooth_lines_in_postgis(conn, table_name)
            add_spatial_index(conn, table_name)

        # # write USACE's contours to postgis for a visual comparison
        write_usace_contours_to_postgis(survey_names, output_dir, postgis_connection)

        print("Pipeline ran successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("PostGIS connection closed.")


if __name__ == "__main__":
    main()
