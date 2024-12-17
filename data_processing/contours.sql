CREATE TABLE contours (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(Polygon, 4326)
);
