BEGIN;
create table raesum_users
(
    id          bigserial
        constraint raesum_users_pk
            primary key,
    external_id varchar not null,
    username    varchar,
    created_at  timestamp default now()
);

create index raesum_users__index_created_at
    on raesum_users (created_at);

create index raesum_users__index_external_id
    on raesum_users (external_id, id, username);

create index raesum_users__index_username
    on raesum_users (username, id);


create table raesum_audit_log
(
    id          bigserial
        constraint raesum_audit_log_pk
            primary key,
    user_id     bigint,
    action_id   integer not null,
    object_type_id integer not null,
    event_at    timestamp default now(),
    metadata    text
);

create index raesum_audit_log__index_at
    on raesum_audit_log (event_at);

create index raesum_audit_log__index_user_action
    on raesum_audit_log (user_id, action_id, event_at);

create index raesum_audit_log__object_action
    on raesum_audit_log (object_type_id, action_id, event_at);

create table raesum_action_types
(
    id          integer
        constraint raesum_action_types_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

create index raesum_action_types__index_string_Key
    on raesum_action_types (string_key, id);

create table raesum_object_types
(
    id          integer
        constraint raesum_object_types_pk
            primary key,
    name        varchar,
    string_key  varchar,
    description text
);

create index raesum_object_types__index_string_key
    on raesum_object_types (string_key, id);


alter table raesum_audit_log
    add constraint raesum_audit_log_raesum_action_types_id_fk
        foreign key (action_id) references raesum_action_types;

alter table raesum_audit_log
    add constraint raesum_audit_log_raesum_object_types_id_fk
        foreign key (object_type_id) references raesum_object_types;
COMMIT;