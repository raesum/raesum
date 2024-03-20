INSERT INTO raesum_users (id,external_id,username) VALUES
(1,'seed1','SeedSamplus'),
(2,'seed2','SeedSamplus2'),
(3,'seed3','SeedSamplus3');
SELECT setval('raesum_users_id_seq', (SELECT max(id) FROM raesum_users));
