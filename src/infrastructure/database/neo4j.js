import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD
  )
);

export async function conectarNeo4j() {
  await driver.verifyConnectivity();
  console.log('Neo4j conectado correctamente');
}

export function obtenerSesionNeo4j() {
  return driver.session({
    database: 'neo4j'
  });
}

export async function cerrarNeo4j() {
  await driver.close();
}
