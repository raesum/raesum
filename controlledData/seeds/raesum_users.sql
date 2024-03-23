INSERT INTO raesum_users (id,current_organization_id,external_id,username,active_status) VALUES
(2,1,'seed1','SeedSamplus',true),
(3,1,'seed2','SeedSamplus2',true),
(4,1,'seed3','SeedSamplus3',true),
(5,1,'seed4','SeedSamplus4',false);
SELECT setval('raesum_users_id_seq', (SELECT max(id) FROM raesum_users));
