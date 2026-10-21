
import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { conectarMongo } from './infrastructure/database/mongo.js';
import { conectarRedis } from './infrastructure/database/redis.js';

// Contexto de autenticación JWT + Redis
import { crearContexto } from './auth/context.js';

// Resolvers de GraphQL
import { resolvers } from './graphql/resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar esquema GraphQL
const typeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql', 'schema.graphql'),
  'utf8'
);

// Iniciar PAWLYAPP
async function iniciarApp() {

  // 1. Conectar MongoDB
  await conectarMongo();

  // 2. Conectar Redis
  await conectarRedis();

  // 3. Crear Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  // 4. Iniciar GraphQL con contexto de autenticación
  const { url } = await startStandaloneServer(server, {
    listen: {
      port: Number(process.env.PORT) || 4000
    },

    context: crearContexto
  });

  console.log(`PAWLYAPP GraphQL listo en: ${url}`);
}

iniciarApp();
