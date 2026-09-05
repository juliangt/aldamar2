# Fase D — Combate por turnos

> **Objetivo:** la `BattleScene` dedicada con la máquina de estados completa:
> habilidades enemigas, fases de jefe, compañeros, comando especial, huida,
> cuerno, XP/niveles y muerte. Es la **Fase D de `specs/fases.md`** expandida.
> **Depende de:** Fase B (dialog/interacción) — puede avanzar en paralelo con C.
> **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md) · Supuestos marcados
> *(interpretación)*: validar contra el Python original (Apéndice A de la maestra).

## Alcance

- `BattleScene` con flujo world → battle → world (sleep/launch/wake/stop).
- Combate 1 héroe + compañeros vs 1–3 enemigos, por turnos, botones táctiles.
- IA enemiga: habilidades por peso/condiciones, veneno, telegraphs, curación,
  refuerzos y fases de jefe.
- Comando especial `corazon`, cuerno de Valoria, huida, XP y niveles, muerte.
- Mapa piloto nuevo: **bosque** (espectro con veneno) + **arena de pruebas**
  (solo desarrollo) para testear todos los enemigos sin mapas extra.

## Máquina de estados

```
INTRO (presentación) → SELECCION_OBJETIVO* → MENÚ_JUGADOR
  ├─ ATACAR ───────────┐
  ├─ OBJETO ───────────┤
  ├─ ESPECIAL (corazon)┤→ RESOLUCIÓN_JUGADOR → ¿victoria? → FIN
  ├─ CUERNO ───────────┤        ↓
  └─ HUIDA ────────────┘  ALIADOS (auto, en orden) → ¿victoria? → FIN
                                   ↓
                          TURNO_ENEMIGOS (uno a uno):
                            fase de jefe? → habilidades (peso/condición) → ataque
                                   ↓ (veneno del héroe/compañeros al inicio de su turno)
                          → MENÚ_JUGADOR (siguiente ronda)
FIN → victoria (XP, nivel, desbloqueo) | huida | derrota → EpilogoScene (muerte)
```

*Selección de objetivo solo si hay >1 enemigo: tap sobre el enemigo (cursor).

## Tareas

- [ ] Transición: al tocar un sprite enemigo del mundo → `scene.sleep('World')`
      + `scene.launch('Battle', {enemigos, aventura, lugar, idx})`; al acabar,
      `scene.stop('Battle')` + `scene.wake('World', resultado)` con
      `{victoria|huida|derrota, idx}` para retirar/dejar el sprite.
- [ ] Escena: fondo por bioma (1-bit + paleta), héroes a la izquierda
      (héroe + compañeros en fila), enemigos a la derecha (jefes ×2 escala),
      barra inferior: **log de combate** (misma DialogBox) + botones.
- [ ] Botones: `ATACAR · OBJETO · CORAZÓN · CUERNO · HUIDA`
      (CUERNO solo si se posee; CORAZÓN solo si `comando_especial ≠ null`;
      OBJETO abre el inventario filtrado a consumibles). Al haber selección de
      objetivo, tap sobre enemigo con PV visibles.
- [ ] Fórmulas base *(interpretación)*:
      - Daño físico = `ataqueEfectivo − defensa` (mín. 1), sin dados.
      - **Ojo de halcón**: +1 mientras el objetivo tenga >50% de PV.
      - Golpe recibido por el héroe: `ataqueEnemigo − defensa − pielDePiedra(1)`
        (mín. 1). Los compañeros restan solo su `defensa`.
      - Stats enemigos ya multiplicados por `Balance` según dificultad.
- [ ] IA enemiga (por turno de cada enemigo):
      1. ¿Cambio de `fase`? (vida < `fases[].vida_menor_que` % → texto
         narrativo, `nombre` y `ataque` nuevos, `habilidades` reemplazadas).
      2. Habilidades elegibles (condición + cadencia `cada_n_turnos`): sorteo
         por `peso`; si ninguna, ataque normal.
      3. `veneno`: en vez de atacar, envenena al objetivo (DoT `dano` durante
         `turnos`, tick al inicio del turno del envenenado) *(interpretación)*.
      4. `golpe_fuerte`: muestra `texto_aviso` (gasta el turno) y marca
         telegraph; el siguiente golpe de ese enemigo suma `dano_extra` y usa
         `texto_golpe` con `{efectivo}` *(interpretación)*.
      5. `curarse`: recupera `puntos` (respeta condición de % de vida).
      6. `refuerzo`: añade `enemigo` al combate (hasta `veces`).
- [ ] Elección de objetivo enemigo: aleatorio entre héroe y compañeros vivos
      *(interpretación)*.
- [ ] Compañeros: tras el héroe, atacan automáticamente (mismo objetivo o
      aleatorio); a 0 PV quedan «caídos» (sprite gris) y se recuperan con 1 PV
      al ganar *(interpretación)*. Se muestran con PV en la UI.
- [ ] Comando especial `corazon`: daño
      `dano_base + dano_por_corrupcion × ⌊grieta/10⌋` (usa el `mensaje` con
      `{efectivo}`), y la grieta sube `corrupcion_coste` × Balance
      *(interpretación — Apéndice A)*. Si la grieta alcanza 100 en combate:
      caída inmediata (epílogo `caida`, sin legado).
- [ ] `cuerno_valoria`: un uso por ítem (se consume): victoria inmediata si
      **todos** los enemigos son «menores» (sin `sin_huida`); si hay jefe, no
      hace nada y no se consume, con aviso *(interpretación)*.
- [ ] Huida: solo si ningún enemigo tiene `sin_huida`; prob. 0.5 *(interpretación)*;
      al fallar, turno enemigo; al lograrla, retorno al mundo con el enemigo
      aún en el mapa (reposicionar al jugador fuera de contacto + 1,5 s de
      gracia de re-encuentro).
- [ ] Recompensas: XP total `Σ experiencia × Balance.xp` para el héroe;
      subida de nivel según §5.5 de la maestra (+5 PV máx/actuales, +1 ataque
      en niveles pares) con toast de nivel.
- [ ] Derrota (PV héroe = 0): fin → `EpilogoScene(muerte)` (texto completo en
      Fase F; aquí un stub que vuelve al menú).
- [ ] `ArenaScene` (solo dev, entrada desde un botón oculto del menú):
      elegir cualquier enemigo/jefe de la aventura activa y stats del héroe a
      gusto — imprescindible para probar Custodio/Morvath sin mapas.

## Detalle técnico

- Estado del combate en un objeto plano serializable (facilita tests y el
  «reanudar» tras refresco, si se decide guardar combates a medias — fuera de
  alcance v1).
- Log de combate = cola de líneas con la DialogBox en modo no-modal-interruptivo
  (los mensajes del enemigo se muestran con avance automático ~1 s, tap para
  acelerar).
- Números flotantes de daño (`tweens` sobre `add.text`) y shake ligero del
  sprite golpeado; flash blanco en cambio de fase de jefe.
- Animaciones mínimas: lunge del atacante (tween ida/vuelta 120 ms). Nada de
  spritesheets complejas en v1.

## Mapeo de datos (piloto: corazon_ceniza)

| Enemigo | Qué prueba |
|---------|------------|
| `lobo` (puente) | Combate básico 1v1 y victoria con XP. |
| `espectro` (bosque) | Veneno con DoT y cadencia `cada_n_turnos`. |
| `trasgo` ×2 (minas, en E/G) | Multi-enemigo y selección de objetivo. |
| `capitan` (aguja, arena) | `golpe_fuerte` telegrafiado + `defensa` 1 + `sin_huida`. |
| `custodio` (arena) | **Fase de jefe** (<45%): texto, ataque 9→11, curarse + golpe fuerte más duro. |
| Reclutas sylvana/aldric/torkan | Compañeros: atacan, caen, reviven con 1 PV. |

## Entregable jugable

Caminar Vegaverde → Molino → Puente y ser atacado por el lobo de sombra;
combatir con botones, ganar XP, subir de nivel; probar en la arena al espectro
(veneno), al Capitán (telegraph) y al Custodio (fase); perder un combate
deliberadamente y ver el stub de muerte; huir correctamente de un enemigo
menor.

## Criterios de aceptación

- [ ] Todos los enemigos de `corazon_ceniza` vencibles y con comportamiento
      correcto desde la arena (incluida la doble `fases` del Custodio).
- [ ] Rasgos comprobados en combate: Ojo de halcón (+1 solo >50% PV objetivo)
      y Piel de piedra (−1 en cada golpe recibido).
- [ ] `corazon` golpea con la fórmula, sube la grieta y a grieta 100 dispara
      la caída.
- [ ] Victoria concede XP × dificultad; el nivel sube según §5.5; los PV
      máximos persisten en el save.
- [ ] El mundo reanuda exactamente donde estaba (posición, enemigos retirados
      solo si victoria; B no rompe el estado del lugar).
- [ ] Sin pérdidas de fotogramas notables con 3 enemigos + 3 compañeros.

## Fuera de alcance (van en...)

`marea`/`eco` (comandos de Sal y Aguja — Fase G) · Morvath y sus refuerzos
(datos ya soportados por la IA; se prueban en G) · epílogos completos y
pantallas finales (Fase F) · eventos que lanzan combate forzado (Fase E).
