import 'dotenv/config';

import mongoose from 'mongoose';

import { RegistroActividadModel } from '../src/infrastructure/mongoose/RegistroActividadModel.js';

async function ejecutarPipeline() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('Conexión exitosa a MongoDB');

    const resultado = await RegistroActividadModel.aggregate([
      {
        $match: {
          pasos: { $gt: 0 }
        }
      },

      {
        $lookup: {
          from: 'perros',
          localField: 'perroId',
          foreignField: '_id',
          as: 'perro'
        }
      },

      {
        $unwind: '$perro'
      },

      {
        $lookup: {
          from: 'razas',
          localField: 'perro.razaId',
          foreignField: '_id',
          as: 'raza'
        }
      },

      {
        $unwind: '$raza'
      },

      {
        $group: {
          _id: '$raza.nombre',
          promedioPasos: {
            $avg: '$pasos'
          },
          totalRegistros: {
            $sum: 1
          },
          totalPasos: {
            $sum: '$pasos'
          }
        }
      },

      {
        $sort: {
          promedioPasos: -1
        }
      }
    ]);

    console.log('Resultado del pipeline:');

    console.table(resultado);
  } catch (error) {
    console.error('Error al ejecutar el pipeline:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

ejecutarPipeline();