// Datos — acceso a los JSON de docs/ (única fuente de verdad de contenido).
// Los enemigos, ítems, tiendas y diálogos se resuelven siempre en el ámbito
// de la aventura activa (D5 de la spec).

import corazonCeniza from "../../docs/aventuras/corazon_ceniza.json";
import brasaVegaverde from "../../docs/aventuras/brasa_vegaverde.json";
import salYCeniza from "../../docs/aventuras/sal_y_ceniza.json";
import agujaSinSombra from "../../docs/aventuras/aguja_sin_sombra.json";
import rasgos from "../../docs/rasgos.json";
import dificultadesJson from "../../docs/dificultades.json";

const AVENTURAS = {
  corazon_ceniza: corazonCeniza,
  brasa_vegaverde: brasaVegaverde,
  sal_y_ceniza: salYCeniza,
  aguja_sin_sombra: agujaSinSombra,
};

// `lugares` viene como lista de pares [id, obj]; el resto como objeto plano.
const arrayCache = new WeakMap();

function porId(coleccion, id) {
  if (Array.isArray(coleccion)) {
    let map = arrayCache.get(coleccion);
    if (!map) {
      map = new Map(coleccion);
      arrayCache.set(coleccion, map);
    }
    return map.get(id);
  }
  return coleccion[id];
}

export const Datos = {
  aventuras: AVENTURAS,
  rasgos,
  dificultades: dificultadesJson.dificultades,
  dificultadPorDefecto: dificultadesJson.por_defecto,

  // Listado de aventuras ordenado por su campo `orden`.
  orden: Object.values(AVENTURAS)
    .slice()
    .sort((a, b) => a.orden - b.orden),

  aventura(id) {
    const av = AVENTURAS[id];
    if (!av) throw new Error(`Aventura desconocida: ${id}`);
    return av;
  },

  lugar(avId, id) {
    return porId(this.aventura(avId).lugares, id);
  },

  enemigo(avId, id) {
    return this.aventura(avId).enemigos[id];
  },

  item(avId, id) {
    return this.aventura(avId).items[id];
  },

  evento(avId, id) {
    return porId(this.aventura(avId).eventos, id);
  },

  dialogo(avId, key) {
    return porId(this.aventura(avId).dialogos, key);
  },

  recluta(avId, id) {
    return this.aventura(avId).reclutas[id];
  },

  rasgo(id) {
    return rasgos[id];
  },

  dificultad(id) {
    return this.dificultades[id];
  },
};

export default Datos;
