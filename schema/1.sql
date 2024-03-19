BEGIN;
CREATE TABLE public.raesum_metadata
(
    datakey character(256) PRIMARY KEY,
    datavalue character(4096)
);
INSERT INTO public.raesum_metadata (datakey,datavalue) VALUES ('schemaVersion',0);
-- CREATE TABLE public.raesum_db_cache
-- (
--     datakey character varying(256) PRIMARY KEY,
--     datavalue json,
--     duration integer,
--     createdAt timestamp with time zone NOT NULL DEFAULT now()
-- );
COMMIT;