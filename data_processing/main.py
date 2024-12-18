import requests
import subprocess
import psycopg2

# Step 1: Download the data
def download_data(url, output_file):
    response = requests.get(url)
    if response.status_code == 200:
        with open(output_file, 'wb') as f:
            f.write(response.content)
        print(f"Data downloaded successfully to {output_file}")
    else:
        print(f"Failed to download data. Status code: {response.status_code}")

# Step 2: Smooth the raster using gdalwarp
def smooth_raster(input_file, output_file):
    command = [
        "gdalwarp",
        "-r", "bilinear",
        "-tr", "0.0033334", "0.0033334",  # Assuming the target cell size is 90m in degrees
        input_file,
        output_file,
        "-overwrite"
    ]
    subprocess.run(command, check=True)
    print(f"Raster smoothed: {output_file}")
    
def drop_table_if_exists(interval, postgis_connection):
    table_name = f"bathymetry_contours_{interval}"
    
    try:
        # Parse connection parameters
        conn_params = {}
        for param in postgis_connection.split():
            key, value = param.split("=")
            conn_params[key] = value
        
        # Connect to PostGIS
        with psycopg2.connect(
            dbname=conn_params["dbname"],
            user=conn_params["user"],
            password=conn_params["password"],
            host=conn_params["host"],
            port=conn_params.get("port", 5432)
        ) as conn:
            with conn.cursor() as cursor:
                # Check and drop the table if it exists
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
        print(f"Error while checking or dropping table {table_name}: {e}")

# Step 3: Generate contours and write them to PostGIS for specified intervals
def generate_contours_and_write_to_postgis(input_file, interval, postgis_connection):
    output_layer = f"bathymetry_contours_{interval}"
    command = [
        "gdal_contour",
        "-i", str(interval),  # Interval of contours
        "-f", "PostgreSQL",  # Output format
        "-a", "depth_m",  # Attribute name for depth
        input_file,
        f"PG:{postgis_connection}",
        "-nln", output_layer
    ]
    subprocess.run(command, check=True)
    print(f"Contours generated and saved to PostGIS: {output_layer}")
    
def add_spatial_index(interval, postgis_connection):
    # Add spatial index to the generated layer in PostGIS
    output_layer = f"bathymetry_contours_{interval}"
    try:
        # Extract PostGIS connection parameters
        conn_params = {}
        for param in postgis_connection.split():
            key, value = param.split("=")
            conn_params[key] = value
        
        # Connect to the PostGIS database
        with psycopg2.connect(
            dbname=conn_params["dbname"],
            user=conn_params["user"],
            password=conn_params["password"],
            host=conn_params["host"],
            port=conn_params.get("port", 5432)
        ) as conn:
            with conn.cursor() as cursor:
                # Create spatial index on the geometry column
                cursor.execute(f"CREATE INDEX ON {output_layer} USING GIST (wkb_geometry);")
                conn.commit()
                print(f"Spatial index created on {output_layer}.")
    except Exception as e:
        print(f"Error while creating spatial index: {e}")

def main():
    # Set up parameters
    url = "https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?bbox=-121.11583,34.97083,-120.59250,35.24500&bboxSR=4326&size=628,329&imageSR=4326&format=tiff&nodata=0&pixelType=F32&interpolation=+RSP_NearestNeighbor&compression=LZ77&renderingRule={%22rasterFunction%22:%22none%22}&f=image"
    raw_image_file = "exportImage.tiff"  # TIFF file after download
    smoothed_raster_file = "bathymetry_smoothed.tiff"
    postgis_connection = "host=localhost user=postgres dbname=postgres password=postgres"
    contour_intervals = [5, 10, 50]
    
    # Download the raw image
    download_data(url, raw_image_file)

    # Smooth the raster
    smooth_raster(raw_image_file, smoothed_raster_file)

    # Generate contours for intervals 5 and 10 and write to PostGIS
    for interval in contour_intervals:
        drop_table_if_exists(interval, postgis_connection) # this is needed because gdal_contour has no overwrite option
        generate_contours_and_write_to_postgis(smoothed_raster_file, interval, postgis_connection)
        add_spatial_index(interval, postgis_connection)

if __name__ == "__main__":
    main()
