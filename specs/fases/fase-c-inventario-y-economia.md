# Fase C — Sistema de inventario y economía

> **Objetivo:** `GameState` completo (posesión, equipo, monedas) con su UI
> táctil, tiendas con descuento por Lengua de mercado y descanso en posadas.
> Es la **Fase C de `specs/fases.md`** expandida.
> **Depende de:** Fase B. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- Inventario completo: recibir, usar, equipar e inspeccionar ítems (5 tipos).
- Economía: monedas, tiendas (solo compra), Lengua de mercado.
- Descanso en lugares `descanso: true`.
- Mapas piloto nuevos: **puente** y **rioclaro** (para llegar a la primera
  tienda siguiendo las `salidas` reales: molino → este → puente → sur → rioclaro).

## Tareas

- [ ] `GameState` real: `inventario` (lista de ids + cantidad para
      consumibles apilables), `equipo {arma, armadura}`, `monedas`,
      stats derivados: `ataqueEfectivo = heroe.ataque + bonus(arma)`,
      `defensa = bonus(armadura)`.
- [ ] `ui/InventarioUI.js` (desde el botón menú): grid/lista táctil, por ítem
      muestra `nombre` + `desc`; acciones según `tipo`:
      - `consumible` → **Usar**: cura `curacion × Balance.curacion` PV
        (cap a PV máx), resta unidad, muestra `texto_uso` si existe
        (p. ej. el panal de Bruna) o toast de curación.
      - `arma` / `armadura` → **Equipar** (cambia el bono; la anterior vuelve
        al inventario sin desequipar nada más).
      - `clave` / `reliquia` / `cuerno` → solo **Inspeccionar** (`desc` +
        `texto_uso`); el cuerno se usa en combate (Fase D).
- [ ] `ui/TiendaUI.js`: en lugares `tienda: true`, al hablar con el tendero
      (NPC de tienda) se abre la lista de `tiendas[lugar]`:
      - Fila por ítem: `nombre`, `desc` corta, **precio efectivo** =
        `precio − 1` si el héroe tiene `lengua_mercado` (mín. 0).
      - Botón Comprar (deshabilitado si no alcanza); toast de compra; sin
        opción de vender.
      - Texto de bienvenida del tendero (el diálogo del NPC ya existente se
        muestra antes de abrir la tienda: p. ej. Dorotea «…Escribe comprar
        <cosa>…» → esa línea se oculta como los `reclutar`).
- [ ] Descanso: en lugares `descanso: true`, botón contextual «Descansar»
      cerca de la cama/fogón: fade a negro, PV al máximo del héroe y
      compañeros, gratuito («el descanso va por la casa»), toast con sabor
      según el lugar.
- [ ] PV en HUD reales; curación fuera de combate siempre vía consumibles o
      descanso (no hay regeneración).
- [ ] Autosave tras comprar/usar/equipar/descansar.

## Detalle técnico

- Las tiradas de precios/equipos son datos: cualquier ítem nuevo en un JSON
  aparece en la tienda/inventario sin tocar código (D4 de la maestra).
- La tienda referencia ids de la **aventura activa** (`tiendas.rioclaro` de
  `corazon_ceniza` ≠ el de `sal_y_ceniza`, aunque compartan clave de lugar).
- Prueba clave de balance temprana: con Ruy (Lengua de mercado) la `espada_corta`
  cuesta 11 y con Tilo 12 — ambos casos deben reflejarse en la UI.

## Mapeo de datos (piloto: corazon_ceniza)

| Elemento | Dato |
|----------|------|
| Tienda de Ríoclaro | `tiendas.rioclaro`: provisiones (5), antorcha (8), espada_corta (12), capa_gris (18) |
| Tienda de Valoria (se estrena en G, ya soportada) | `tiendas.valoria`: provisiones, hoja_sylva (25), cuerno_valoria (20), capa_gris |
| Objetos del camino | bosque: `hierbas` (cura 8) — al construirse su mapa en E/G; puente sin objetos |
| Descanso | rioclaro (`descanso: true`, Dorotea) |

## Entregable jugable

Caminar de Vegaverde a Ríoclaro, hablar con Dorotea, comprar provisiones y la
espada corta (viendo el descuento si el héroe lo tiene), equipar la espada y
ver el ataque subido, curarse con provisiones tras bajar PV (provisionalmente
con un «botón de daño de prueba» dev), y descansar en la posada.

## Criterios de aceptación

- [ ] Los 12 ítems de `corazon_ceniza` se renderizan con nombre/desc correctos
      en inventario y tienda (prueba con un inventario dev que los contenga).
- [ ] Lengua de mercado resta exactamente 1 moneda en cada compra.
- [ ] Equipar/desequipar arma y armadura refleja ataque/defensa en el HUD y en
      los stats que usará el combate (Fase D).
- [ ] Consumible cura `curacion × Balance.curacion` según dificultad.
- [ ] Descanso cura al grupo entero y es gratis; el autosave sobrevive a un
      refresco del navegador (continuará en Fase F; aquí basta inspeccionar
      localStorage).

## Fuera de alcance (van en...)

Combate y uso del cuerno (Fase D) · eventos de decisión como el encargo de
Dorotea (Fase E) · selección de héroe/dificultad real (Fase F) · resto de
tiendas y mapas (Fase G).
