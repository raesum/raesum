BEGIN;
CREATE TABLE raesum_metadata
(
    datakey   varchar(256) PRIMARY KEY,
    datavalue varchar(4096)
);
INSERT INTO raesum_metadata (datakey, datavalue)
VALUES ('schemaVersion', 0);
INSERT INTO raesum_metadata (datakey, datavalue)
VALUES ('initialized', false);

-- CREATE TABLE raesum_db_cache
-- (
--     datakey character varying(256) PRIMARY KEY,
--     datavalue json,
--     duration integer,
--     createdAt timestamp with time zone NOT NULL DEFAULT now()
-- );

create table raesum_organization
(
    id            bigserial
        constraint raesum_organization_pk
            primary key,
    name          varchar not null,
    active_status boolean   default false,
    created_at    timestamp default now()
);

alter table raesum_organization
    owner to seneca;

create index raesum_organization__active_status
    on raesum_organization (active_status, id);



create table raesum_user
(
    id                      bigserial
        constraint raesum_user_pk
            primary key,
    current_organization_id integer not null
        constraint raesum_user___fk_user_org
            references raesum_organization,
    external_id             varchar not null
        constraint raesum_user_pk_3
            unique,
    username                varchar
        constraint raesum_user_pk_2
            unique,
    active_status           boolean   default false,
    created_at              timestamp default now()
);

alter table raesum_user
    owner to seneca;

create index raesum_user__index_created_at
    on raesum_user (created_at);

create index raesum_user__index_external_id
    on raesum_user (external_id, id, username);

create index raesum_user__index_username
    on raesum_user (username, id);

create index raesum_user__index_organization_id
    on raesum_user (current_organization_id, id);



create table raesum_organization_x_user
(
    user_id    bigint not null
        constraint raesum_organization_x_user_raesum_user_id_fk
            references raesum_user,
    org_id     bigint not null
        constraint raesum_organization_x_user_raesum_organization_id_fk
            references raesum_organization,
    created_at timestamp default now(),
    constraint raesum_organization_x_user_pk
        primary key (user_id, org_id)
);

alter table raesum_organization_x_user
    owner to seneca;

create index raesum_organization_x_user_org_id_index
    on raesum_organization_x_user (org_id);



create table raesum_auth_action_type
(
    id          integer not null
        constraint raesum_auth_action_type_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

alter table raesum_auth_action_type
    owner to seneca;

create index raesum_auth_action_type__index_string_key
    on raesum_auth_action_type (string_key, id);

create table raesum_auth_object_type
(
    id          integer not null
        constraint raesum_auth_object_type_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

alter table raesum_auth_object_type
    owner to seneca;

create index raesum_auth_object_type__index_string_key
    on raesum_auth_object_type (string_key, id);

create table raesum_auth_scope_type
(
    id          integer
        constraint raesum_auth_scope_type_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

create index raesum_auth_scope_type_string_key_index
    on raesum_auth_scope_type (string_key);

create table public.raesum_audit_log
(
    id             bigserial primary key not null,
    user_id        bigint,
    action_id      integer            not null,
    object_type_id integer            not null,
    object_id      integer,
    event_at       timestamp without time zone default now(),
    metadata       text,
    foreign key (action_id) references public.raesum_auth_action_type (id)
        match simple on update no action on delete no action,
    foreign key (object_type_id) references public.raesum_auth_object_type (id)
        match simple on update no action on delete no action,
    foreign key (user_id) references public.raesum_user (id)
        match simple on update no action on delete no action
);
create index raesum_audit_log__index_at on raesum_audit_log using btree (event_at);
create index raesum_audit_log__index_user_action on raesum_audit_log using btree (user_id, action_id, event_at);
create index raesum_audit_log__object_action on raesum_audit_log using btree (object_type_id, action_id, event_at);
create index raesum_audit_log__object_id_action on raesum_audit_log using btree (object_id, action_id, event_at);



create table raesum_auth_role
(
    id            serial
        constraint raesum_auth_role_pk
            primary key,
    string_key    varchar,
    name          varchar,
    active_status boolean default true
);

create index raesum_auth_role_id_active_status_index
    on raesum_auth_role (active_status);


create table raesum_auth_role_x_permission
(
    role_id        integer
        constraint raesum_auth_role_x_permission_raesum_auth_role_id_fk
            references raesum_auth_role,
    object_type_id integer
        constraint raesum_auth_role_x_permission_raesum_auth_object_type_id_fk
            references raesum_auth_object_type,
    scope_id       integer
        constraint raesum_auth_role_x_permission_raesum_auth_scope_type_id_fk
            references raesum_auth_scope_type,
    action_id      integer
        constraint raesum_auth_role_x_permission_raesum_auth_action_type_id_fk
            references raesum_auth_action_type,
    constraint raesum_auth_role_x_permission_pk
        primary key (role_id, object_type_id, scope_id, action_id)
);


create table raesum_auth_user_x_organization_x_role
(
    user_id bigint  not null,
    org_id  bigint  not null,
    role_id integer not null,
    primary key (user_id, org_id, role_id),
    foreign key (role_id) references raesum_auth_role (id)
        match simple on update no action on delete no action,
    foreign key (org_id) references raesum_organization (id)
        match simple on update no action on delete no action,
    foreign key (user_id) references raesum_user (id)
        match simple on update no action on delete no action
);
create index raesum_auth_user_x_organization_x_role_org_id_role_id_index on raesum_auth_user_x_organization_x_role using btree (org_id, role_id);

create table raesum_auth_role_x_organization_restriction
(
    role_id integer not null
        constraint raesum_auth_rxor_raesum_auth_role_id_fk
            references raesum_auth_role,
    org_id  bigint  not null
        constraint raesum_auth_rxor_raesum_organization_id_fk
            references raesum_organization,
    constraint raesum_auth_role_x_organization_restriction_pk
        primary key (org_id, role_id)
);

create index raesum_auth_role_x_organization_restriction_role_id_index
    on raesum_auth_role_x_organization_restriction (role_id);



COMMIT;