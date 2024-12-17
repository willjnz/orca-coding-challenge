CREATE EXTENSION postgis;


CREATE TABLE bathymetry_contours (
    id SERIAL PRIMARY KEY,
    file_name text,
    processed_datetime DATETIME,
    geom GEOMETRY(Polygon, 4326)
);