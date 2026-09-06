import { Combate } from './src/core/Combate.js';

const mockGameState = {
  semilla: 1234,
  aventura: 'corazon_ceniza',
  dificultad: 'normal',
  heroe: 'guerrero',
  nombre: 'TestHero',
  stats: { vida: 1000, vidaMax: 1000, ataque: 5 }, // high health so they don't die
  ataqueEfectivo: () => 5,
  defensa: () => 1,
  companeros: ['curandera'],
  usarItem: () => {},
  quitarItem: () => {},
  cantidad: () => 0,
  guardar: () => {},
  xp: 0,
  nivel: 1,
  companerosSalud: {
    curandera: { vida: 1000, vidaMax: 1000 }
  }
};

const rngMock = {
  next: () => 0.5,
  chance: () => true,
};

function runBenchmark() {
  const iter = 5000000;
  let combate = new Combate(mockGameState, ['trasgo', 'lobo'], rngMock);

  // Make heroes and enemies resilient
  for (let h of combate.heroes) {
    h.vida = 10000;
    h.vidaMax = 10000;
  }
  for (let e of combate.enemigos) {
    e.vida = 10000;
    e.vidaMax = 10000;
  }

  const start = performance.now();
  for (let i = 0; i < iter; i++) {
    combate.iniciarRonda();
    combate.turnoAliados();
    combate.turnoEnemigos();
    combate.aplicarResultado();

    // reset estado and turno to keep it going
    combate.estado = 'menu';
  }
  const end = performance.now();

  console.log(`Total time for ${iter} iterations: ${(end - start).toFixed(2)} ms`);
}

runBenchmark();
