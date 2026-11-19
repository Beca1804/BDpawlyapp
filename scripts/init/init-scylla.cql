CREATE KEYSPACE IF NOT EXISTS auditoria WITH replication = {'class':'NetworkTopologyStrategy','datacenter1':1} AND durable_writes = true;
CREATE TABLE IF NOT EXISTS auditoria.logs_eventos (
 fecha_dia date,
 tipo_evento text,
 timestamp timestamp,
 evento_id timeuuid,
 usuario_id text,
 jti text,
 resultado text,
 PRIMARY KEY ((fecha_dia,tipo_evento),timestamp,evento_id)
) WITH CLUSTERING ORDER BY (timestamp DESC,evento_id DESC);
