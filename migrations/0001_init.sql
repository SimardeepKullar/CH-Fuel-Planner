CREATE EXTENSION IF NOT EXISTS postgis;

----------------------------------- Stations and Prices ---------------------------------------------
-- Table for the all the stations in the US.
CREATE TABLE stations (
	id 				bigserial PRIMARY KEY,
	site_ref 		text NOT NULL UNIQUE,
	name_raw 		text NOT NULL, -- "LOVES #368"
	store_number 	integer, -- 368
	city 			text NOT NULL,
	state_usps 		char(2) NOT NULL,
	geom 			geography (Point, 4326) -- NULL until resolved
);
CREATE INDEX stations_geom_gix ON stations USING GIST (geom);
CREATE INDEX stations_store    ON stations (store_number);

-- Table for the price imports.
CREATE TABLE price_imports (
	id             	bigserial PRIMARY KEY,
	file_name      	text     NOT NULL,
	file_sha256    	char(64) NOT NULL UNIQUE,
	effective_date 	date     NOT NULL UNIQUE,
	row_count      	integer  NOT NULL,
	imported_at    	timestamptz NOT NULL DEFAULT now()
);

-- Table for station prices.
CREATE TABLE station_prices (
	id           	bigserial PRIMARY KEY,
  	station_id   	bigint NOT NULL REFERENCES stations(id),
	import_id    	bigint NOT NULL REFERENCES price_imports(id) ON DELETE CASCADE,
	effective_on    date   NOT NULL,       -- ONE DAY. Not a range.
	product_type 	text   NOT NULL,       -- mapped by hand, never defaulted

	cost         	numeric(8,4) NOT NULL,
	federal_tax  	numeric(8,4) NOT NULL,
	state_tax    	numeric(8,4) NOT NULL,
	sales_tax    	numeric(8,4) NOT NULL,
	freight      	numeric(8,4) NOT NULL,
	other        	numeric(8,4) NOT NULL,
	total_cost   	numeric(8,4) NOT NULL,
	retail_price 	numeric(8,4) NOT NULL,
	your_price   	numeric(8,4) NOT NULL,
	savings	  	 	numeric(8,4) NOT NULL,

	UNIQUE (station_id, product_type, effective_on)
);
CREATE INDEX station_prices_lookup ON station_prices (effective_on, product_type, station_id);

----------------------------------- Routes, Plans and Budget ----------------------------------------
-- Table for the routes. 
CREATE TABLE routes (
	id          	bigserial PRIMARY KEY,
	request_hash 	char(64) NOT NULL UNIQUE,  -- sha256 of the ORS request
	line         	geography(LineString,4326) NOT NULL,
	polyline     	text    NOT NULL,          -- precision-5, for the map
	distance_m   	numeric(12,1) NOT NULL,    -- metres live INSIDE the adapter
	duration_s   	numeric(12,1) NOT NULL,
	computed_at  	timestamptz NOT NULL DEFAULT now(),
	expires_at   	timestamptz NOT NULL
);
CREATE INDEX routes_line_gix ON routes USING GIST (line);

---------------------------------------------- Trucks -----------------------------------------------
CREATE TABLE trucks (
	id               bigserial PRIMARY KEY,
	truck_number     integer NOT NULL UNIQUE,  -- e.g. 247 — the fleet unit number

	-- Truck dimensions and weight
	height_m         numeric(4,2) NOT NULL,
	width_m          numeric(4,2) NOT NULL,
	length_m         numeric(5,2) NOT NULL,
	weight_t         numeric(5,2) NOT NULL,

	-- Fuel model
	tank_gallons     numeric(6,1) NOT NULL,
	avg_mpg          numeric(4,2) NOT NULL,
	reserve_fraction numeric(4,3) NOT NULL DEFAULT 0.100,
	max_leg_miles    numeric(6,1) NOT NULL DEFAULT 500,
);