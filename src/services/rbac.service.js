
import { obtenerSesionNeo4j } from '../infrastructure/database/neo4j.js';

// ========================================
// VALIDAR ACCESO A RUTAS CON RBAC
// ========================================

export async function validarAccesoRuta(userId, path, method, operation) {
  const session = obtenerSesionNeo4j();

  try {
    const resultado = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_ROLE]->(rol:Role)
      MATCH (rol)-[:INHERITS*0..]->(rolEfectivo:Role)
      MATCH (rolEfectivo)-[:CAN_ACCESS]->(ruta:Route {
        path: $path
      })
      WHERE ($method IS NULL OR ruta.method = $method)
        AND ($operation IS NULL OR ruta.operation = $operation)
      RETURN COUNT(ruta) > 0 AS autorizado
      `,
      { userId, path, method: method ?? null, operation: operation ?? null }
    );

    return resultado.records[0]?.get('autorizado') === true;

  } finally {
    await session.close();
  }
}

// ========================================
// OBTENER MENÚ DINÁMICO CON RUTAS
// ========================================

export async function obtenerMenuUsuario(userId) {
  const session = obtenerSesionNeo4j();

  try {
    const resultado = await session.run(
      `
      MATCH (u:User {id: $userId})-[:HAS_ROLE]->(rol:Role)
      MATCH (rol)-[:INHERITS*0..]->(rolEfectivo:Role)
      MATCH (rolEfectivo)-[:CAN_VIEW_MENU]->(menu:MenuNode)

      WHERE NOT menu.id IN [
        'MENU_BIENVENIDA',
        'MENU_LOGIN',
        'MENU_REGISTRO'
      ]

      OPTIONAL MATCH (menu)-[:NAVIGATES_TO]->(ruta:Route)

      OPTIONAL MATCH (padre:MenuNode)-[:HAS_CHILD]->(menu)
      RETURN DISTINCT
        padre.id AS parentId,
        menu.id AS id,
        menu.title AS title,
        menu.order AS orden,
        menu.icon AS icon,
        ruta.path AS path

      ORDER BY orden, title
      `,
      { userId }
    );

    return resultado.records.map((registro) => ({
      id: registro.get('id'),
      title: registro.get('title'),
      order: registro.get('orden')?.toNumber?.() ??
             registro.get('orden'),
      icon: registro.get('icon'),
      path: registro.get('path'),
      parentId: registro.get('parentId')
    }));

  } finally {
    await session.close();
  }
}

// ========================================
// ASIGNAR AUTOMÁTICAMENTE ROL TUTOR
// ========================================

export async function asignarRolTutor(userId) {
  const session = obtenerSesionNeo4j();

  try {
    const resultado = await session.run(
      `
      MATCH (rol:Role {name: 'TUTOR'})
      MERGE (usuario:User {id: $userId})
      MERGE (usuario)-[:HAS_ROLE]->(rol)
      RETURN usuario.id AS id
      `,
      {
        userId: userId.toString()
      }
    );

    if (resultado.records.length === 0) {
      throw new Error(
        'El rol TUTOR no existe en Neo4j'
      );
    }

    console.log(
      '[NEO4J] Rol TUTOR asignado correctamente:',
      userId
    );

    return true;

  } catch (error) {
    console.error(
      '[NEO4J] Error al asignar rol TUTOR:',
      error.message
    );

    throw error;

  } finally {
    await session.close();
  }
}
