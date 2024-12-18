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


def generate_contours_and_write_to_postgis(input_file, interval, conn, postgis_connection):
    """
    Generate contours and write them to PostGIS.
    """
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
    
    
def simplify_lines(interval, conn, tolerance=0.0000045):
    """
    Simplify the vector lines in the PostGIS table to about 0.5m (0.0000045 degrees at the equator). This smooths the lines and makes them lighter to load on the frontend
    """
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


def add_spatial_index(interval, conn):
    """
    Add a spatial index to the generated contours layer in PostGIS.
    """
    output_layer = f"bathymetry_contours_{interval}"
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE INDEX ON {output_layer} USING GIST (wkb_geometry);")
            conn.commit()
            print(f"Spatial index created on {output_layer}.")
    except Exception as e:
        print(f"Error while creating spatial index on {output_layer}: {e}")


def main():
    # Set up parameters
    url = "https://gis.ngdc.noaa.gov/arcgis/rest/services/multibeam_mosaic/ImageServer/exportImage?bbox=-121.11583,34.97083,-120.59250,35.24500&bboxSR=4326&size=628,329&imageSR=4326&format=tiff&nodata=0&pixelType=F32&interpolation=+RSP_NearestNeighbor&compression=LZ77&renderingRule={%22rasterFunction%22:%22none%22}&f=image"
    raw_image_file = "exportImage.tiff"  # TIFF file after download
    smoothed_raster_file = "bathymetry_smoothed.tiff"
    postgis_connection = "host=localhost user=postgres dbname=postgres password=postgres"
    contour_intervals = [50, 100, 500] # this is in centimeters so that table names don't have decimals

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

        # Download the raw image
        download_data(url, raw_image_file)

        # Smooth the raster
        smooth_raster(raw_image_file, smoothed_raster_file)

        # Generate contours and process for each interval
        for interval in contour_intervals:
            drop_table_if_exists(interval, conn)  # Drop the table if it exists
            generate_contours_and_write_to_postgis(smoothed_raster_file, interval, conn, postgis_connection)
            simplify_lines(interval, conn)
            add_spatial_index(interval, conn)  # Add spatial index

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()
            print("PostGIS connection closed.")


if __name__ == "__main__":
    main()
