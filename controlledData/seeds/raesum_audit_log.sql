INSERT INTO raesum_audit_log (id, user_id,action_id,object_type_id,object_id) VALUES
(1,4,1,1,1),
(2,2,1,1,2),
(3,4,1,1,1),
(4,3,1,1,3),
(5,5,5,1,3);
SELECT setval('raesum_audit_log_id_seq', (SELECT max(id) FROM raesum_audit_log));
