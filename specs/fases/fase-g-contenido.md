# Fase G — Contenido: las 4 aventuras completas

> **Objetivo:** con el motor cerrado (Fases 0–F), producir todo el contenido:
> 39 mapas decorados por bioma, sprites/paletas, tiendas, secretos y comandos
> especiales de cada aventura, y una pasada de pruebas completas por aventura.
> **Depende de:** Fase F. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- Decorado final de los 12 mapas de `corazon_ceniza` (pasaron greybox en E).
- Producción de Brasa (5), Sal (9) y Aguja (13): mapas, biomas, paletas.
- Sprites: héroes restantes, NPCs y enemigos propios de cada aventura.
- Comandos especiales `marea` y `eco`; secretos abejas/gaviota/campanilla.
- Prueba integral (todas las ramas) de cada aventura.

## Biomas y paletas (recolor del tileset 1-bit)

| Bioma | Lugares | Paleta |
|-------|---------|--------|
| Huerto falro | vegaverde, ejido, colmenar, lavadero | verde cálido / ocre |
| Camino y río | molino, puente, vado, calzada, encrucijada | ocre / azul río |
| Bosque Umbrío | bosque | verde profundo |
| Aldea / ciudad | rioclaro, valoria | piedra clara / dorado |
| Minas goran | minas, barrok | azul piedra |
| Ciénaga | cienagas | verde grisáceo |
| Torre | refugio | gris cálido |
| Costa y salinas | faro, esteros, cauce, salinas, casa_sal, salina_vieja | azul sal / blanco |
| Yermos | yerma | gris ceniza con grietas rojas |
| Aguja | aguja, aguja_pies, aguja_cima | blanco pálido |
| Volcán | umbak, tejera (brasa ardiente) | rojo oscuro |

## Producción por aventura

### 1. El Corazón de Ceniza (12 mapas — decorado)

vegaverde, molino, puente, bosque, rioclaro, valoria, minas, cienagas,
refugio, yerma, aguja, umbak. Ya jugables; en esta fase: decorado final,
paletas y sprites definitivos (Belthar, Oldo, Sylvana, Aldric, Torkan,
Dorotea; lobo, espectro, trasgo, lóbero, Capitán, Custodio).

### 2. La Brasa de Vegaverde (5 mapas)

| Lugar | Notas de producción |
|-------|---------------------|
| vegaverde | Oldo NPC; carta_belthar + hoz; 5 monedas; descanso; tejo ardiendo al fondo (vista este). |
| ejido | mirlo; eventos `casa_llena`, `rona` (+6 grieta); salidas a tejera/lavadero. |
| tejera | jefe **ahumado** (26/6, sin huida); gatillo `final` (umbral 50). |
| lavadero | Perpetua NPC; capa_encerada; 8 monedas; evento `agua_que_cuenta` (legado). |
| colmenar | Bruna NPC + decisión `colmena` (aceptar → panal + flag `bruna` = reclutarla). |

Sin tienda; sin comando especial; secreto **abejas** (semilla 20). Jefe con
una sola fase (sin `fases`): valida que el motor también sirve jefes simples.

### 3. La Sal y la Ceniza (9 mapas)

| Lugar | Notas |
|-------|-------|
| rioclaro | Dorotea (diálogo array de 3); tienda (pan_sal, aguardiente, cuchillo_marea, abrigo_salino); descanso. |
| vado | gaviota; eventos `noticia`, `cadena_en_el_vado` (legado). |
| calzada | gaviota; cruce faro/esteros. |
| faro | Iseo NPC; decisión `faro`: encender (farol + flag `faro_encendido`) o quitar (+8 grieta, farol + `faro_robado`). |
| esteros | cangrejo (defensa 1); evento `hilo_gris` (legado). |
| cauce | perla_gris + 10 monedas + cangrejo. |
| salinas | mirlo; evento `salmuera` (+6 grieta). |
| casa_sal | jefe menor **ahogado** (huida posible: `sin_huida: false`); Maruxa NPC (reclutar); tienda (pan_sal, arpón, aguardiente). |
| salina_vieja | jefe **viuda** (36/7, def 1, sin huida); `requiere: farol_sal`; gatillo `final` (umbral 55). |

Comando especial **marea** (10 + 3×⌊g/10⌋, coste 12); secreto **gaviota**
(semilla 40); héroes Bruna/Gala/Támara con prólogos propios.

### 4. La Aguja sin Sombra (13 mapas)

| Lugar | Notas |
|-------|-------|
| vegaverde | Oldo (array 3) + Enebro NPC (reclutar); hogaza; descanso. |
| molino | capitan_ceniza (versión débil, huida posible); Tilo NPC (reclutar); eventos `arranque`, `cadena_en_el_molino` (legado). |
| encrucijada | sombra; cruce norte/sur. |
| rioclaro | Dorotea + Maruxa (reclutar); tienda (hogaza, jerba, capa_gris, lanza); descanso. |
| valoria | heraldo NPC; decisión `estandarte`: jurar (flag `consejo`) o guardia (flag `guardia`) — ambas entregan estandarte; descanso. |
| bosque | mirlo; jerba. |
| puente | espectro; evento `hilos_en_el_agua` (legado). |
| refugio | Belthar NPC; evento `campanilla` (**otorgar** la campanilla); descanso. |
| barrok | trasgo; Torkan NPC; evento `fragua` (curar grupo, −10 grieta); tienda (vino_hondo, coraza_barrok, hoja_clara, maza_goran). |
| cienagas | espectro; evento `cienizas` (+6 grieta). |
| yerma | 2 lóberos; `requiere: estandarte`; evento `ceniza_viva` (+5 grieta). |
| aguja_pies | mirlo; `requiere: campanilla`; evento `regreso` (emboscar capitan si `no_flag: consejo`). |
| aguja_cima | **triple combate secuencial**: eco_voz → capitan_rehecho → morvath (fase <50%: ataque 11, curarse, refuerzo de espectro ×1); gatillo `final` (umbral 60). |

Comando especial **eco** (12 + 3×⌊g/10⌋, coste 12); secreto **campanilla**
(semilla 100). El triple combate de la cima exige lugar limpio **completo**
antes del gatillo final (regla de la Fase E).

## Tareas

- [x] Plantillas Tiled por bioma (11 plantillas) para batir mapas rápido.
- [x] Producir/decorar los 39 mapas con el validador JSON↔mapa en verde.
- [x] Sprites y paletas: 7 héroes restantes, NPCs nuevos (Oldo, Perpetua,
      Iseo, Maruxa, Heraldo…), enemigos nuevos (mirlo, ahumado, gaviota,
      cangrejo, ahogado, viuda, sombra, eco_voz, morvath, capitanes).
- [x] Comandos especiales `marea` y `eco` (mismos botones y fórmula que
      `corazon`; Brasa simplemente no tiene botón).
- [x] Secretos: abejas (colmenar y alrededores), gaviota (costa), campanilla
      (tras otorgarla), con sus `textos`, `texto_combate` y semillas.
- [x] Prueba integral por aventura (checklist abajo) + fixes.
- [x] Legado en cadena real: jugar Corazón → Brasa → Sal → Aguja en orden y
      verificar eventos de cadena, fama y banderas exportadas/importadas.

## Criterios de aceptación (por aventura)

- [x] Jugable de prólogo a epílogo sin errores, con todas las decisiones en
      sus dos ramas y los jefes derrotados en las 3 dificultades (al menos
      una pasada completa en «camino» y puntos de control en las otras dos).
- [x] Los finales especiales con `requiere_flag` aparecen solo cuando procede
      (cera de Bruna, farera, Alianza de las Cuatro).
- [x] Las puertas `requiere` de cada aventura bloquean con su `requiere_texto`.
- [x] Secretos encontrables (probando semillas fijas vía consola dev).
- [x] Validador JSON↔mapa: 0 desajustes en 39 mapas.

## Fuera de alcance (van en...)

Balance fino de dificultades, audio final, rendimiento y RC (Fase H).
