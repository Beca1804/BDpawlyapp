CREATE CONSTRAINT rbac_user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT rbac_role_name IF NOT EXISTS FOR (r:Role) REQUIRE r.name IS UNIQUE;
CREATE CONSTRAINT rbac_route_key IF NOT EXISTS FOR (r:Route) REQUIRE (r.path, r.method, r.operation) IS UNIQUE;
CREATE CONSTRAINT rbac_menu_id IF NOT EXISTS FOR (m:MenuNode) REQUIRE m.id IS UNIQUE;
MERGE (:Role {name:'TUTOR'});
MERGE (:Role {name:'ADMIN'});
MERGE (:Role {name:'SUPER_ADMIN'});
MATCH (a:Role {name:'ADMIN'}), (t:Role {name:'TUTOR'}) MERGE (a)-[:INHERITS]->(t);
MATCH (s:Role {name:'SUPER_ADMIN'}), (a:Role {name:'ADMIN'}) MERGE (s)-[:INHERITS]->(a);
UNWIND [
 {path:'/mi-perfil',method:'QUERY',operation:'miPerfil',role:'TUTOR'},
 {path:'/mascotas',method:'QUERY',operation:'misMascotas',role:'TUTOR'},
 {path:'/actividad/:mascotaId',method:'QUERY',operation:'resumenPaseos',role:'TUTOR'},
 {path:'/salud/historial/:mascotaId',method:'QUERY',operation:'historialMedico',role:'TUTOR'},
 {path:'/veterinaria/citas',method:'QUERY',operation:'listarCitasPorPerro',role:'TUTOR'},
 {path:'/mascotas/crear',method:'MUTATION',operation:'crearMascota',role:'TUTOR'},
 {path:'/actividad/registrar',method:'MUTATION',operation:'registrarActividad',role:'TUTOR'},
 {path:'/salud/vacunas/agregar',method:'MUTATION',operation:'agregarVacuna',role:'TUTOR'},
 {path:'/veterinaria/citas/crear',method:'MUTATION',operation:'crearCitaVeterinaria',role:'TUTOR'},
 {path:'/comunidad/publicar',method:'MUTATION',operation:'crearPublicacion',role:'TUTOR'},
 {path:'/admin/usuarios',method:'QUERY',operation:'listarUsuarios',role:'ADMIN'},
 {path:'/admin/razas/crear',method:'MUTATION',operation:'crearRaza',role:'ADMIN'},
 {path:'/admin/veterinarias/crear',method:'MUTATION',operation:'crearVeterinaria',role:'ADMIN'}
] AS item
MERGE (r:Route {path:item.path,method:item.method,operation:item.operation})
WITH r,item MATCH (rol:Role {name:item.role}) MERGE (rol)-[:CAN_ACCESS]->(r);
UNWIND [
 {id:'CUENTA',title:'Mi cuenta',order:1,icon:'user',role:'TUTOR'},
 {id:'CUIDADO',title:'Cuidado',order:2,icon:'heart',role:'TUTOR'},
 {id:'ADMINISTRACION',title:'Administración',order:3,icon:'settings',role:'ADMIN'}
] AS item
MERGE (m:MenuNode {id:item.id}) SET m.title=item.title,m.order=item.order,m.icon=item.icon
WITH m,item MATCH (r:Role {name:item.role}) MERGE (r)-[:CAN_VIEW_MENU]->(m);
UNWIND [
 {id:'PERFIL',title:'Mi perfil',order:1,icon:'user',parent:'CUENTA',path:'/mi-perfil',operation:'miPerfil',role:'TUTOR'},
 {id:'MASCOTAS',title:'Mis mascotas',order:2,icon:'paw',parent:'CUENTA',path:'/mascotas',operation:'misMascotas',role:'TUTOR'},
 {id:'ACTIVIDAD',title:'Actividad',order:1,icon:'walk',parent:'CUIDADO',path:'/actividad/:mascotaId',operation:'resumenPaseos',role:'TUTOR'},
 {id:'HISTORIAL',title:'Historial médico',order:2,icon:'health',parent:'CUIDADO',path:'/salud/historial/:mascotaId',operation:'historialMedico',role:'TUTOR'},
 {id:'CITAS',title:'Citas veterinarias',order:3,icon:'calendar',parent:'CUIDADO',path:'/veterinaria/citas',operation:'listarCitasPorPerro',role:'TUTOR'},
 {id:'USUARIOS',title:'Usuarios',order:1,icon:'users',parent:'ADMINISTRACION',path:'/admin/usuarios',operation:'listarUsuarios',role:'ADMIN'}
] AS item
MERGE (m:MenuNode {id:item.id}) SET m.title=item.title,m.order=item.order,m.icon=item.icon
WITH m,item MATCH (p:MenuNode {id:item.parent}), (r:Route {path:item.path,method:'QUERY',operation:item.operation}), (rol:Role {name:item.role})
MERGE (p)-[:HAS_CHILD]->(m) MERGE (m)-[:NAVIGATES_TO]->(r) MERGE (rol)-[:CAN_VIEW_MENU]->(m);
