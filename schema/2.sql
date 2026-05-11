create table public.raesum_file_status
(
    id            integer not null
        constraint raesum_file_status_pk
            primary key,
    datakey       varchar(256)
        constraint raesum_file_status_pk_2
            unique,
    active_status boolean,
    description   varchar(4096),
    displayname   varchar(255)
);


create table public.raesum_file
(
    id        serial not null
        constraint raesum_file_pk
            unique,
    user_id    bigint                                                     not null
        constraint raesum_file_raesum_user_id_fk
            references public.raesum_user,
    org_id     integer                                                    not null
        constraint raesum_file_raesum_organization_id_fk
            references public.raesum_organization,
    quarantine boolean   default true                                     not null,
    awsregion  varchar(256)                                               not null,
    bucket     varchar(512)                                               not null,
    path       varchar(2048)                                              not null,
    created_at timestamp default now(),
    status_id  integer
        constraint raesum_file_raesum_file_status_id_fk
            references public.raesum_file_status,
    constraint id
        primary key (user_id, org_id, id)
);


create table public.raesum_file_metadata_keys
(
    id            serial
        constraint raesum_file_metadata_keys_pk
            primary key,
    datakey       varchar(256)
        constraint raesum_file_metadata_keys_pk_2
            unique,
    active_status boolean,
    description   varchar(4096),
    displayname   varchar(255),
    writable      boolean
);




create index raesum_file_metadata_keys_active_status_datakey_index
    on public.raesum_file_metadata_keys (active_status, datakey);

create table public.raesum_file_x_metadata
(
    datakey varchar(256) not null,
    file_id bigint       not null
        constraint raesum_file_x_metadata_raesum_file_id_fk
            references public.raesum_file (id),
    value   varchar(164096),
    constraint raesum_file_x_metadata_pk
        primary key (file_id, datakey)
);


