BEGIN;
CREATE TABLE public.raesum_metadata
(
    datakey character(256) PRIMARY KEY,
    datavalue character(4096)
);
INSERT INTO public.raesum_metadata (datakey,datavalue) VALUES ('schemaVersion',0);
INSERT INTO public.raesum_metadata (datakey,datavalue) VALUES ('initialized',false);

-- CREATE TABLE public.raesum_db_cache
-- (
--     datakey character varying(256) PRIMARY KEY,
--     datavalue json,
--     duration integer,
--     createdAt timestamp with time zone NOT NULL DEFAULT now()
-- );

create table public.raesum_organizations
(
    id            bigserial
        constraint raesum_organizations_pk
            primary key,
    name          varchar not null,
    active_status boolean   default false,
    created_at    timestamp default now()
);

alter table public.raesum_organizations
    owner to seneca;

create index raesum_organizations__active_status
    on public.raesum_organizations (active_status, id);



create table public.raesum_users
(
    id                      bigserial
        constraint raesum_users_pk
            primary key,
    current_organization_id integer not null
        constraint raesum_users___fk_user_org
            references public.raesum_organizations,
    external_id             varchar not null
        constraint raesum_users_pk_3
            unique,
    username                varchar
        constraint raesum_users_pk_2
            unique,
    active_status            boolean   default false,
    created_at              timestamp default now()
);

alter table public.raesum_users
    owner to seneca;

create index raesum_users__index_created_at
    on public.raesum_users (created_at);

create index raesum_users__index_external_id
    on public.raesum_users (external_id, id, username);

create index raesum_users__index_username
    on public.raesum_users (username, id);

create index raesum_users__index_organization_id
    on public.raesum_users (current_organization_id, id);


create table public.raesum_action_types
(
    id          integer not null
        constraint raesum_action_types_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

alter table public.raesum_action_types
    owner to seneca;

create index raesum_action_types__index_string_key
    on public.raesum_action_types (string_key, id);

create table public.raesum_object_types
(
    id          integer not null
        constraint raesum_object_types_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

alter table public.raesum_object_types
    owner to seneca;

create index raesum_object_types__index_string_key
    on public.raesum_object_types (string_key, id);

create table public.raesum_audit_log
(
    id             bigserial
        constraint raesum_audit_log_pk
            primary key,
    user_id        bigint
        constraint raesum_audit_log_raesum_user_id_fk
            references public.raesum_users,
    action_id      integer not null
        constraint raesum_audit_log_raesum_action_types_id_fk
            references public.raesum_action_types,
    object_type_id integer not null
        constraint raesum_audit_log_raesum_object_types_id_fk
            references public.raesum_object_types,
    object_id      integer not null,
    event_at       timestamp default now(),
    metadata       text
);

alter table public.raesum_audit_log
    owner to seneca;

create index raesum_audit_log__index_at
    on public.raesum_audit_log (event_at);

create index raesum_audit_log__index_user_action
    on public.raesum_audit_log (user_id, action_id, event_at);

create index raesum_audit_log__object_action
    on public.raesum_audit_log (object_type_id, action_id, event_at);

create index raesum_audit_log__object_id_action
    on public.raesum_audit_log (object_id, action_id, event_at);




COMMIT;