import test from 'node:test';
import assert from 'node:assert/strict';
import {VeterinariaModel} from '../src/infrastructure/mongoose/VeterinariaModel.js';
const base={nombre:'Veterinaria',direccion:'Dirección de prueba',telefono:'0000000000'};
test('una veterinaria sin coordenadas no emite geometría incompleta',()=>{
 const model=new VeterinariaModel(base);assert.equal(model.validateSync(),undefined);assert.equal(model.toObject().ubicacion,undefined);
});
test('la ubicación opcional conserva GeoJSON válido y rechaza coordenadas fuera de rango',()=>{
 const valid=new VeterinariaModel({...base,ubicacion:{coordinates:[-106.1,28.6]}});assert.equal(valid.validateSync(),undefined);assert.equal(valid.ubicacion.type,'Point');
 const invalid=new VeterinariaModel({...base,ubicacion:{coordinates:[-200,95]}});assert.ok(invalid.validateSync());
});
