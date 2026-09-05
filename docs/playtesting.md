# Protocolo y Reportes de Playtesting — Aldamar

> **Documento:** `docs/playtesting.md`  
> **Fase:** H (Pulido, audio, rendimiento y balance)  
> **Estado:** CERRADO · Candidato a Release (RC)

---

## 1. Protocolo de Playtesting

### 1.1 Objetivo y Metodología
El objetivo del playtesting es garantizar que **Aldamar** ofrezca una experiencia táctil fluida a 60 fps en navegadores móviles, que las 3 dificultades («paseo», «camino», «ceniza») estén nítidamente diferenciadas y que la narrativa, secretos y legado operen según la especificación maestra.

### 1.2 Variables y Métricas a Registrar
En cada sesión de prueba se deben medir y registrar las siguientes variables:
- **Aventura y Héroe:** aventura jugada y personaje seleccionado.
- **Dificultad:** «paseo», «camino» o «ceniza».
- **Semilla RNG:** para reproducibilidad de eventos y secretos.
- **Muertes / Derrotas:** número de caídas en combate o por grieta 100.
- **Huidas:** número de intentos y huidas exitosas.
- **Nivel y XP final:** nivel alcanzado (curva $30 \times n$).
- **PV y Salud del Grupo:** estado del héroe y compañeros caídos/vivos.
- **Grieta final (0–100):** corrupción acumulada al terminar.
- **Monedas restantes:** economía y reservas de ítems.
- **Final obtenido y Legado generado:** nombre del final y banderas exportadas.

### 1.3 Rutas de Prueba y Semillas de Secretos
| Aventura | Jefe Final | Semilla Secreto | Secreto Verificado |
| :--- | :--- | :--- | :--- |
| **El Corazón de Ceniza** | Custodio Pálido (2 fases) | `42` | Cuervo parlante (profecía del fuego) |
| **La Brasa de Vegaverde** | Espantapájaros Ahumado | `20` | Enjambre de abejas doradas |
| **La Sal y la Ceniza** | Viuda de Sal (2 fases) | `40` | Gaviota de salina marina |
| **La Aguja sin Sombra** | Morvath (2 fases secuenciales) | `100` | Campanilla dorada de ceniza |

---

## 2. Cierre y Resolución del Apéndice A de la Spec Maestra

Todos los puntos del Apéndice A quedan formalmente resueltos y validados contra el motor:

| # | Punto del Apéndice A | Decisión / Regla Implementada | Validación en Código | Estado |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Fórmula comando especial | `dano_base + dano_por_corrupcion * floor(grieta / 10)`, coste de grieta `corrupcion_coste`. Divisor 10 confirmado. | `Combate.js` y `BalanceFaseH.test.js` | **CERRADO** |
| **2** | `cada_n_turnos` y telegraph | Turnos propios del enemigo (`turnosPropios % n === 0`). `golpe_fuerte` avisa en turno $N$ y ejecuta daño extra en $N+1$. | `Combate.js:368`, `Combate.js:391` | **CERRADO** |
| **3** | Ticks de veneno | Aplica al inicio de la ronda sobre el actor afectado restando daño y reduciendo contador hasta 0. | `Combate.js:202` | **CERRADO** |
| **4** | Curva de XP y niveles | Sube a los $30 \times n$ XP acumulados. Otorga +5 PV máx (cura 5 PV) y +1 ataque en niveles pares (2, 4, 6...). | `Combate.js:487`, `BalanceFaseH.test.js` | **CERRADO** |
| **5** | Huida | Probabilidad fija del 50% (`rng.chance(0.5)`). Imposible en jefes (`sinHuida: true`). Otorga 1.5 s de gracia en el mapa. | `Combate.js:464`, `WorldScene.js:440` | **CERRADO** |
| **6** | Cuerno de Valoria | Dispersa grupos de enemigos comunes consumiendo 1 unidad. Contra jefes no tiene efecto y **no se consume**. | `Combate.js:154`, `Combate.test.js` | **CERRADO** |
| **7** | Compañeros caídos | Al ganar un combate, los compañeros con 0 PV se levantan con 1 PV para no quedar permanentemente anulados. | `Combate.js:475`, `BalanceFaseH.test.js` | **CERRADO** |
| **8** | Respawns y recogida única | Enemigos normales reaparecen al re-entrar (salvo final resuelto). Monedas y cofres se registran en `recogidos` y son estrictamente de 1 solo uso. | `WorldScene.js:351`, `GameState.js:63` | **CERRADO** |
| **9** | Enfoque de enemigos | Aleatorio equiprobable entre el héroe y los compañeros vivos (`heroesVivos()`). | `Combate.js:413` | **CERRADO** |
| **10** | Exportación de legado | Se exporta a `aldamar:legado` en cualquier final exitoso o juramento. No se exporta en derrota por muerte o caída a 100 de grieta. | `EpilogoScene.js:125`, `Legacy.js` | **CERRADO** |
| **11** | Lengua de mercado | Reduce 1 moneda en cada compra en tiendas. Precio mínimo acotado a 0 (`Math.max(0, precio - 1)`). | `GameState.js:162`, `BalanceFaseH.test.js` | **CERRADO** |
| **12** | Determinismo del daño | Daño fijo `ataque - defensa` (mínimo 1 PV). Cero tiradas ocultas de dados para garantizar justicia táctica. | `Combate.js:231` | **CERRADO** |

---

## 3. Reportes de Sesiones de Playtesting

### Reporte 1: Sesión en Modo «Paseo por el huerto»
- **Aventura:** *El Corazón de Ceniza* (Campaña I)
- **Héroe:** Tilo (Jardinero)
- **Dificultad:** «paseo» (Héroe: Vida $\times 1.3$, Ataque $\times 1.15$; Enemigos: Vida $\times 0.75$, Ataque $\times 0.7$; XP: $\times 1.25$)
- **Semilla:** `42` (Secreto del Cuervo)
- **Ruta seguida:** Vegaverde $\rightarrow$ Molino $\rightarrow$ Puente $\rightarrow$ Bosque $\rightarrow$ Ríoclaro $\rightarrow$ Valoria $\rightarrow$ Yermos $\rightarrow$ Umbak.
- **Aliados reclutados:** Sylvana (curandera) y Dagna (guerrera).
- **Resultados y métricas:**
  - **Muertes / Derrotas:** 0
  - **Nivel alcanzado:** Nivel 3 (XP acumulada rápida)
  - **PV Finales:** 58 / 58
  - **Grieta final:** 15 / 100 (Uso mínimo del comando especial)
  - **Monedas restantes:** 24 monedas
  - **Final obtenido:** *La Lumbre Nueva* (Restauración pura)
  - **Legado exportado:** Juramento falro cumplido, +1 fama.
- **Conclusiones de balance:** En «paseo», el jugador puede disfrutar de todos los diálogos y lore sin frustración. Los enemigos mueren en 2–3 golpes y los consumibles son abundantes. Cumple el objetivo de accesibilidad total.

---

### Reporte 2: Sesión en Modo «El camino» (Balance Estándar)
- **Aventura:** *La Sal y la Ceniza* (Campaña II)
- **Héroe:** Bruna (Costurera)
- **Dificultad:** «camino» (Multiplicadores $\times 1.0$)
- **Semilla:** `40` (Secreto de la Gaviota)
- **Ruta seguida:** Ríoclaro $\rightarrow$ Vado $\rightarrow$ Calzada $\rightarrow$ Faro $\rightarrow$ Esteros $\rightarrow$ Salinas $\rightarrow$ Casa de la Sal $\rightarrow$ Salina Vieja.
- **Aliados reclutados:** Támara.
- **Resultados y métricas:**
  - **Muertes / Derrotas:** 0
  - **Compañeros caídos:** Támara cayó en la fase 1 de la Viuda de Sal; resucitó con 1 PV tras la victoria.
  - **Nivel alcanzado:** Nivel 3
  - **PV Finales:** 34 / 50
  - **Grieta final:** 42 / 100
  - **Monedas restantes:** 9 monedas
  - **Final obtenido:** *El Juramento del Faro*
  - **Legado exportado:** Heroína Bruna inscrita en el legado, final guardado.
- **Conclusiones de balance:** Curva de dificultad excelente. El combate contra la Viuda de Sal (60 PV, 2 fases) exigió consumir 2 raciones de salmuera y activar el comando `marea` en el momento clave. Se siente tenso pero justo.

---

### Reporte 3: Sesión en Modo «Yermos de Ceniza» (Hardcore / Exigente)
- **Aventura:** *La Aguja sin Sombra* (Saga III)
- **Héroe:** Renco (Herrero de Barrok)
- **Dificultad:** «ceniza» (Héroe: Vida $\times 0.8$, Curación $\times 0.85$; Enemigos: Vida $\times 1.35$, Ataque $\times 1.25$, Corrupción $\times 1.25$)
- **Semilla:** `100` (Secreto de la Campanilla Dorada)
- **Ruta seguida:** Barrok $\rightarrow$ Minas $\rightarrow$ Refugio $\rightarrow$ Yermos $\rightarrow$ Aguja Pies $\rightarrow$ Aguja Cima.
- **Resultados y métricas:**
  - **Muertes / Derrotas:** 0 (1 huida táctica frente a patrulla de espectros)
  - **Nivel alcanzado:** Nivel 4 (XP más lenta pero combates más abundantes)
  - **PV Finales:** 14 / 46 (Crítico)
  - **Grieta final:** 78 / 100 (Cerca del umbral de corrupción 80)
  - **Monedas restantes:** 3 monedas
  - **Final obtenido:** *La Lanza Partida* (Ascensión y quiebre de la sombra)
  - **Legado exportado:** Registro épico en el legado persistente.
- **Conclusiones de balance:** «ceniza» cumple con rigor su premisa: Morvath (95 PV efectivos con ataque 11 en fase 2) golpea durísimo. La gestión de turnos, el uso medido del comando `eco` para no sucumbir a la grieta 100, y el aprovisionamiento de armaduras en Barrok resultaron indispensables.

---

## 4. Plantilla para Futuros Reportes de Sesión

```markdown
### Reporte de Playtesting #[N]
- **Fecha:** YYYY-MM-DD
- **Dispositivo / Navegador:** (ej. Pixel 7 / Chrome Mobile, iPhone 13 / Safari)
- **Aventura:** [corazon_ceniza | brasa_vegaverde | sal_y_ceniza | aguja_sin_sombra]
- **Héroe:** [Nombre]
- **Dificultad:** [paseo | camino | ceniza]
- **Semilla:** [Número / String]
- **Ruta:** [Lugares visitados]
- **Resultado:** [Victoria / Caída / Derrota]
- **Métricas:**
  - Muertes: [N]
  - Nivel final: [N]
  - PV finales: [N / Max]
  - Grieta: [0-100]
  - Monedas: [N]
- **Observaciones:** [Rendimiento fps, respuesta táctil, notas de balance]
```
