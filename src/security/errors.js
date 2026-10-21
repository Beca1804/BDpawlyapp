import { GraphQLError } from 'graphql';
export function fail(message,code='BAD_USER_INPUT') {
 throw new GraphQLError(message,{extensions:{code,...(code==='UNAUTHENTICATED'?{http:{status:401}}:code==='SERVICE_UNAVAILABLE'?{http:{status:503}}:{})}});
}
export function safeError(error) {
 if(error.code===11000) fail('Ya existe un registro con esos datos.','CONFLICT');
 if(['ValidationError','CastError','StrictModeError'].includes(error.name)) fail('Revisa los tipos, fechas y campos obligatorios.');
 throw error;
}
