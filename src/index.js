import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { conectarMongo } from './infrastructure/database/mongo.js';
import { resolvers } from './graphql/resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql', 'schema.graphql'),
  'utf8'
);

async function iniciarApp() {
  await conectarMongo();

  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  const { url } = await startStandaloneServer(server, {
    listen: {
      port: Number(process.env.PORT) || 4000
    }
  });

  console.log(`PAWLYAPP GraphQL listo en: ${url}`);
}

iniciarApp();