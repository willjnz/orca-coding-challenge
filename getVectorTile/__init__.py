# pylint: disable=invalid-name
"""
Tile Server for Azure Functions
Author: Stefan Eberlein
Sources:
Paul Ramsey:
https://github.com/pramsey/minimal-mvt/
https://github.com/CrunchyData/pg_tileserv/
Henry Thasler:
https://github.com/henrythasler/cloud-tileserver/
Oslandia:
https://gitlab.com/Oslandia/postile/
"""
import uuid
import logging
from typing import Dict, Union, List
from asyncio import TimeoutError, sleep
import datetime
from asyncpg import OutOfMemoryError, TooManyConnectionsError, ConnectionDoesNotExistError
import azure.functions as func
import helpers as h

MAX_RETRIES = 3
MAX_ZOOM = 22
MIN_ZOOM = 0
RESOLUTION = 4096
BUFFER = 256
MAX_FEATURES_PER_TILE = 10000
TARGET_SRID = 3857  # Web/Pseudo/Spherical-Mercator
SPATIAL_BUFFER = 50


async def main(req: func.HttpRequest) -> func.HttpResponse:
    """ Get a vector tile from PostGIS. """
    # Handle OPTIONS request
    if req.method == "OPTIONS":
        return func.HttpResponse(status_code=204,
                                 headers={
                                     "Allow": "GET",
                                     "Access-Control-Allow-Origin": "*",
                                     "Access-Control-Allow-Headers": "authorization"
                                 }
                                 )
    # Validate token
    decoded_token = None
    try:
        token = dict(req.headers)['authorization'].replace('Bearer ', '')
        decoded_token = await h.decode_b2c_jwt_token(token)
    # pylint: disable=broad-except
    except Exception:
        logging.exception('Authentication failed.')
        return func.HttpResponse(status_code=403)
    params = dict(req.params)
    params['company'] = decoded_token['jobTitle'].capitalize()
    if not tile_params_are_valid(params):
        return func.HttpResponse('Parameters not valid. ' +
                                 'Expected parameters: x, y, z, layer, year.',
                                 status_code=400)
    tile = construct_tile(params)
    # bbox = tile_to_bbox(tile)
    sql = tile_to_sql(tile)
    # query db
    try:
        res = await query_db(sql)
    except ConnectionError as err:
        logging.error("Error querying DB: %s", repr(err))
        return func.HttpResponse(
            "This service is currently unavailable. Please contact your admin.", status_code=503,
        )
    return func.HttpResponse(
        res[0]['st_asmvt'], status_code=200,
        headers={
            "Content-Type": "application/vnd.mapbox-vector-tile",
            "Access-Control-Allow-Origin": "*"}
    )


async def query_db(sql, retries=0):
    """ Queries DB with SQL string """
    if retries > MAX_RETRIES:
        raise ConnectionError(
            f"Maximum number of retries ({MAX_RETRIES}) exceeded.")
    # get pg connection
    try:
        pool = await h.get_pg_pool()
        async with pool.acquire() as connection:
            res = await connection.fetch(sql, timeout=1 + retries*3)
            return res
    except (OutOfMemoryError,
            ConnectionResetError,
            ConnectionDoesNotExistError,
            ConnectionError,
            TimeoutError,
            TooManyConnectionsError) as err:
        logging.warning("Error while querying DB: %s - retry in %s",
                        repr(err), str(.5 + retries*2))
        await sleep(.5 + retries*2)
        return await query_db(sql, retries+1)

# ToDo Unit test this!
# Do we have all keys we need?
# Do the tile x/y coordinates make sense at this zoom level?


def tile_params_are_valid(params: dict) -> bool:
    """ Check if tile params are valid """
    # first check the required params exist
    if not ('x' in params and 'y' in params and
            'z' in params and 'layer' in params and
            'year' in params):  # and 'company' in params):
        return False
    try:
        # Sanity check x y z params
        x, y, z = [int(params['x']), int(params['y']), int(params['z'])]
        n_tiles_in_zoomlvl = 2 ** z
        if x >= n_tiles_in_zoomlvl or y >= n_tiles_in_zoomlvl:
            return False
        if x < 0 or y < 0:
            return False
        if z < MIN_ZOOM or z > MAX_ZOOM:
            return False
        # Check if shift_id present
        if params['layer'].lower() not in ['shift', 'gps', 'spray', 'weed', 'restricted_area']:
            return False
        # check if valid UUIDs
        if 'shift_id' in params:
            uuid.UUID(params['shift_id'])
        # uuid.UUID(params['company'])

        # Sanity check year
        year = int(params['year'])
        now = datetime.datetime.now()
        if year < 1990 or year > now.year:
            return False
        return True
    # We need to catch all errors here to not yield a 500 error to the user
    # pylint: disable=broad-except
    except Exception as exc:
        logging.error('Error occurred when validating input: %s', repr(exc))
        return False


def construct_tile(params: Dict[str, str]) -> dict:
    """ Constructs a tile dictionary with all relevant params """
    tile: Dict[str, Union[str, int, uuid.UUID, List[str]], int] = dict()
    tile['x'] = int(params['x'])
    tile['y'] = int(params['y'])
    tile['z'] = int(params['z'])
    tile['layer'] = params['layer'].lower()
    tile['layer_alias'] = params['layer'].lower().capitalize().replace('Gps', 'GPSPoint')
    tile['company'] = params['company']
    if 'shift_id' in params:
        tile['shift_id'] = uuid.UUID(params['shift_id'])
    if 'fields' in params and len(params['fields'].split(',')) > 0:
        tile['fields'] = params['fields'].split(',')
    else:
        tile['fields'] = ''
    tile['year'] = params['year']
    return tile


def tile_to_bbox(tile: Dict[str, Union[str, int, uuid.UUID, List[str]]]) -> dict:
    """ Gets the bounding box from a tiles x,y,z parameters """
    # Width of world in EPSG:3857
    world_merc_max = 20037508.3427892
    world_merc_min = -1 * world_merc_max
    world_merc_size = world_merc_max - world_merc_min
    # Width in tiles
    world_tile_size = 2 ** tile['z']
    # Tile width in EPSG:3857
    tile_merc_size = world_merc_size / world_tile_size
    # Calculate geographic bounds from tile coordinates
    # XYZ tile coordinates are in "image space" so origin is
    # top-left, not bottom right
    bbox = dict()
    bbox['xmin'] = world_merc_min + tile_merc_size * tile['x']
    bbox['xmax'] = world_merc_min + tile_merc_size * (tile['x'] + 1)
    bbox['ymin'] = world_merc_max - tile_merc_size * (tile['y'] + 1)
    bbox['ymax'] = world_merc_max - tile_merc_size * (tile['y'])
    return bbox


def tile_to_sql(tile: dict) -> str:
    """ Converts a tile params to an SQL query to get an MVT tile """
    # TileEnvelope is only available in PostGIS 3, if dealing with PostGIS 2,
    # use ST_MakeEnvelope(Xmin, Ymin, Xmax, Ymax, SRID) with bbox

    tile['year_sql_clause'] = f"""AND date_part(\'year\', s."start_date_time") = {tile['year']}"""
    tile['year_sql_clause_ra'] = f"""date_part('year', "start_date_time") = {tile['year']} OR date_part('year', "stop_date_time") = {tile['year']}"""

    tile['company_sql_clause'] = ""
    tile['company_sql_clause_ra'] = ""
    if tile['company'] != 'Bayer' and tile['company'] != 'Envu':
        tile['company_sql_clause'] = f"""AND comp."label" = '{tile['company']}'"""
        tile['company_sql_clause_ra'] = f"""AND "company_label" = '{tile['company']}'"""
    tile['layer_fields_clause'] = ""
    tile['mvt_fields_clause'] = ""
    if tile['fields']:
        tile['layer_fields_clause'] = ', l."' + \
                                      '", l."'.join(tile['fields']) + \
                                      '"'
        # cast all fields to text to handle jsonb columns in MVT
        tile['mvt_fields_clause'] = ', mvtgeom."' + \
                                    '"::text, mvtgeom."'.join(tile['fields']) + \
                                    '"::text'
    # There is a different SQL query for the RestrictedArea
    # this is needed because in the current SQL query the joins to Shift and Vehicle tables will error because the RestrictedArea table doesn't relate to these but it needs to relate to the company table
    if tile['layer'] == 'weed':
        # Check if weed recognition is enabled
        sql_string = """
            WITH
                mvtgeom AS (
                    SELECT 
                        ST_AsMVTGeom(
                            l.geometry,
                            ST_TileEnvelope({z}, {x}, {y})
                        ) AS geometry {layer_fields_clause}
                    FROM masterdata.{layer} l
                    LEFT JOIN masterdata.shift s ON (s.shift_id = l.shift_id)
                    LEFT JOIN masterdata.vehicle_company vc ON ((vc.vehicle_id = s.vehicle_id) and (s.start_date_time BETWEEN vc.start_date_time AND vc.stop_date_time))
                    LEFT JOIN masterdata.company comp ON (vc.company_id = comp.company_id)
                    WHERE vc.has_weed_subscription IS TRUE AND
                        l.geometry &&
                        ST_Buffer(ST_TileEnvelope({z}, {x}, {y}), {spatial_buffer})
                        {company_sql_clause}
                        {shift_id_where_clause}
                        {year_sql_clause}
                    LIMIT 50000
                )
            SELECT
                ST_AsMVT(
                    (SELECT _ FROM (SELECT mvtgeom.geometry {mvt_fields_clause}) AS _),
                    '{layer_alias}'
                )
            FROM mvtgeom
        """
        ##  needed to  preserve field names, from https://dba.stackexchange.com/a/72139
    elif tile['layer'] == 'restricted_area':
        # this is the RestrictedArea
        sql_string = """
            WITH
            areas AS (
                SELECT * FROM masterdata.{layer} ra
                LEFT JOIN
                (SELECT company_id AS "CompanyId_", label AS "CompanyLabel" FROM masterdata.company) c
                ON c."CompanyId_" = ra.company_id
            ),
            areas_filtered AS (
                SELECT * FROM areas WHERE 1 = 1 {company_sql_clause_ra}
            ),
            mvtgeom AS (
                SELECT ST_AsMVTGeom(
                    l.geometry,
                    ST_TileEnvelope({z}, {x}, {y})
                ) AS geometry {layer_fields_clause}
                FROM areas_filtered l
                WHERE l.geometry && ST_Buffer(ST_TileEnvelope({z}, {x}, {y}), {spatial_buffer})
                LIMIT 50000
            )
            SELECT
                    ST_AsMVT(
                        (SELECT _ FROM (SELECT mvtgeom.geometry {mvt_fields_clause}) AS _),
                        '{layer_alias}'
                    )
            FROM mvtgeom
        """
        logging.info('restricted area query')
        logging.info(sql_string)
    else:
        sql_string = """
            WITH
                mvtgeom AS (
                    SELECT 
                        ST_AsMVTGeom(
                            l.geometry,
                            ST_TileEnvelope({z}, {x}, {y})
                        ) AS geometry {layer_fields_clause}
                    FROM masterdata.{layer} l
                    LEFT JOIN masterdata.shift s ON (s.shift_id = l.shift_id)
                    LEFT JOIN masterdata.vehicle_company vc ON ((vc.vehicle_id = s.vehicle_id) and (s.start_date_time BETWEEN vc.start_date_time AND vc.stop_date_time))
                    LEFT JOIN masterdata.company comp ON (vc.company_id = comp.company_id)
                    WHERE 
                        l.geometry &&
                        ST_Buffer(ST_TileEnvelope({z}, {x}, {y}), {spatial_buffer})
                        {company_sql_clause}
                        {shift_id_where_clause}
                        {year_sql_clause}
                    LIMIT 50000
                )
            SELECT
                ST_AsMVT(
                    (SELECT _ FROM (SELECT mvtgeom.geometry {mvt_fields_clause}) AS _),
                    '{layer_alias}'
                )
            FROM mvtgeom
        """
    # last part is needed to preserve field names, from https://dba.stackexchange.com/a/72139
    # optimisations:
    # include where clause with && operator:
    #    https://dba.stackexchange.com/questions/191666/vs-st-intersects-performance
    # Use ST_Simplify for simplifying geometries?
    tile['shift_id_where_clause'] = ''
    if 'shift_id' in tile:
        tile['shift_id_where_clause'] = f"""
            AND l.shift_id = '{str(tile['shift_id'])}'"""
    return sql_string.format(**tile, target_srid=TARGET_SRID, spatial_buffer=SPATIAL_BUFFER)
