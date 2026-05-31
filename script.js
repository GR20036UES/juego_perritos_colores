/* =====================================================
   PERRITOS DE COLORES — Lógica del juego
   ===================================================== */

// ── Constantes ──────────────────────────────────────
const COLORES = ['amarillo', 'verde', 'azul', 'rojo', 'naranja', 'rosado'];

const COLOR_HEX = {
  amarillo: '#FFD600',
  verde:    '#4CAF50',
  azul:     '#2196F3',
  rojo:     '#F44336',
  naranja:  '#FF9800',
  rosado:   '#E91E8C',
};

const DEFAULT_NOMBRES_JUGADORES = ['Jugador 1', 'Jugador 2', 'Jugador 3'];
const EMOJIS_JUGADORES  = ['🧑', '👩', '🧒'];

const TOTAL_PERRITOS    = 12;   // 2 de cada color
const GOAL              = 6;    // perritos para ganar
const MAX_CAPTURAS      = 2;    // capturas posibles por turno
const MAX_REVELACIONES  = 2;    // revelaciones por turno
const REVEAL_DURATION   = 1100; // ms que el color queda visible

// ── Estado del juego ────────────────────────────────
let estado = {};
let configuracion = {
  numJugadores: 3,
  nombresJugadores: [...DEFAULT_NOMBRES_JUGADORES],
};

// ── Inicialización ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  actualizarInputsJugadores();
  iniciarJuego();
});

/**
 * Crea el estado inicial y renderiza el tablero.
 */
function iniciarJuego() {
  // Crear los 12 perritos con colores aleatorios (2 de cada)
  const coloresBase = COLORES.flatMap(c => [c, c]);
  const coloresMezclados = mezclar(coloresBase);

  // Perritos: { id, color, dueño: null | 0|1|2 }
  const perritos = coloresMezclados.map((color, i) => ({
    id:    i,
    color: color,
    dueno: null,
  }));

  const nombres = configuracion.nombresJugadores.slice(0, configuracion.numJugadores);
  while (nombres.length < configuracion.numJugadores) {
    nombres.push(`Jugador ${nombres.length + 1}`);
  }

  estado = {
    perritos:        perritos,
    turnoActual:     0,
    dadoColores:     [null, null],
    dadosLanzados:   false,
    revelaciones:    0,
    turnoActivo:     false,
    numJugadores:    configuracion.numJugadores,
    nombresJugadores: nombres,
  };

  renderizarJuego();
  actualizarUI();
  mostrarToast(`🎮 ¡Nuevo juego iniciado! ${estado.nombresJugadores[0]} comienza.`, 'turno');
}

// ── Helpers ──────────────────────────────────────────

/** Mezcla un array en orden aleatorio (Fisher-Yates). */
function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Retorna el color de un dado aleatorio. */
function colorAleatorio() {
  return COLORES[Math.floor(Math.random() * COLORES.length)];
}

// ── Renderizado principal ────────────────────────────

/**
 * Re-renderiza todo el tablero.
 */
function renderizarJuego() {
  renderizarTablero();
  renderizarJugadores();
}

/**
 * Dibuja los perritos del tablero central.
 */
function renderizarTablero() {
  const container = document.getElementById('tablero-perritos');
  container.innerHTML = '';

  for (let slot = 0; slot < TOTAL_PERRITOS; slot++) {
    const perrito = estado.perritos.find(p => p.id === slot && p.dueno === null);
    const slotEl = document.createElement('div');
    slotEl.className = 'perrito-slot';

    if (perrito) {
      slotEl.appendChild(crearElementoPerrito(perrito, 'tablero'));
    } else {
      slotEl.classList.add('empty');
    }

    container.appendChild(slotEl);
  }
}

/**
 * Dibuja los mazos de cada jugador.
 */
function renderizarJugadores() {
  const jugadoresPanel = document.getElementById('jugadores-panel');
  jugadoresPanel.style.gridTemplateColumns = `repeat(${estado.numJugadores}, 1fr)`;

  for (let j = 0; j < 3; j++) {
    const panel     = document.getElementById(`panel-j${j + 1}`);
    const container = document.getElementById(`perritos-j${j + 1}`);
    const contador  = document.getElementById(`contador-j${j + 1}`);

    if (j >= estado.numJugadores) {
      panel.classList.add('hidden');
      continue;
    }

    panel.classList.remove('hidden');
    panel.querySelector('.jugador-nombre').textContent = estado.nombresJugadores[j];

    const perritosDueno = estado.perritos.filter(p => p.dueno === j);

    container.innerHTML = '';
    for (let slot = 0; slot < TOTAL_PERRITOS; slot++) {
      const perrito = estado.perritos.find(p => p.id === slot && p.dueno === j);
      const slotEl = document.createElement('div');
      slotEl.className = 'perrito-slot';

      if (perrito) {
        slotEl.appendChild(crearElementoPerrito(perrito, 'jugador', j));
      } else {
        slotEl.classList.add('empty');
      }

      container.appendChild(slotEl);
    }

    contador.textContent = `${perritosDueno.length} 🐶`;
    panel.classList.toggle('activo', j === estado.turnoActual);
  }
}

/**
 * Crea el elemento DOM de un perrito.
 * @param {Object} perrito - datos del perrito
 * @param {string} origen  - 'tablero' | 'jugador'
 * @param {number} [dueno] - índice dueño si es de jugador
 */
function crearElementoPerrito(perrito, origen, dueno) {
  const wrap = document.createElement('div');
  wrap.className = 'perrito-wrap';
  wrap.dataset.id     = perrito.id;
  wrap.dataset.origen = origen;
  if (dueno !== undefined) wrap.dataset.dueno = dueno;

  // SVG del perrito
  wrap.innerHTML = buildPerritoSVG(perrito.color) +
    `<div class="perrito-color-tag" style="background:${COLOR_HEX[perrito.color]};color:${textColor(perrito.color)}">${perrito.color.toUpperCase()}</div>`;

  // Manejador de clic
  wrap.addEventListener('click', () => manejarClicPerrito(perrito.id, wrap));

  return wrap;
}

/**
 * Construye el SVG de un perrito (cuerpo café, lengua del color oculto).
 * La lengua empieza invisible; se muestra con la clase 'revelando'.
 */
function buildPerritoSVG(color) {
  const hex = COLOR_HEX[color];
  return `
  <svg class="perrito-svg" viewBox="0 0 62 72" xmlns="http://www.w3.org/2000/svg">
    <!-- Sombra suave -->
    <ellipse cx="31" cy="68" rx="20" ry="4" fill="rgba(0,0,0,0.2)"/>
    <!-- Cuerpo -->
    <rect x="14" y="32" width="34" height="28" rx="10" fill="#c8a06a"/>
    <!-- Cabeza -->
    <circle cx="31" cy="28" r="16" fill="#d4aa7d"/>
    <!-- Orejas -->
    <ellipse cx="16" cy="20" rx="7" ry="10" fill="#b8864a" transform="rotate(-20,16,20)"/>
    <ellipse cx="46" cy="20" rx="7" ry="10" fill="#b8864a" transform="rotate(20,46,20)"/>
    <!-- Cara interna orejas -->
    <ellipse cx="16" cy="21" rx="4" ry="6" fill="#e8aa85" transform="rotate(-20,16,21)"/>
    <ellipse cx="46" cy="21" rx="4" ry="6" fill="#e8aa85" transform="rotate(20,46,21)"/>
    <!-- Ojos -->
    <circle cx="24" cy="25" r="3.5" fill="#333"/>
    <circle cx="38" cy="25" r="3.5" fill="#333"/>
    <circle cx="25" cy="24" r="1.2" fill="#fff"/>
    <circle cx="39" cy="24" r="1.2" fill="#fff"/>
    <!-- Nariz -->
    <ellipse cx="31" cy="31" rx="4" ry="2.5" fill="#6d3a2a"/>
    <!-- Lengua (oculta por defecto, color del perrito) -->
    <g class="perrito-lengua">
      <rect x="26" y="33" width="10" height="12" rx="5" fill="${hex}" stroke="rgba(0,0,0,0.15)" stroke-width="0.5"/>
      <line x1="31" y1="33" x2="31" y2="45" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
    </g>
    <!-- Manchas cuerpo -->
    <circle cx="22" cy="46" r="5" fill="rgba(0,0,0,0.08)"/>
    <circle cx="38" cy="48" r="4" fill="rgba(0,0,0,0.06)"/>
    <!-- Patitas -->
    <rect x="17" y="56" width="9" height="8" rx="4" fill="#b8864a"/>
    <rect x="36" y="56" width="9" height="8" rx="4" fill="#b8864a"/>
    <!-- Colita -->
    <path d="M48 40 Q58 30 55 22" stroke="#c8a06a" stroke-width="5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/** Retorna color de texto legible sobre fondo de color. */
function textColor(color) {
  return color === 'amarillo' ? '#333' : '#fff';
}

// ── Actualización de UI ───────────────────────────────

/**
 * Sincroniza todos los indicadores del encabezado con el estado.
 */
function actualizarUI() {
  const j = estado.turnoActual;
  document.getElementById('turn-player-name').textContent = estado.nombresJugadores[j];

  const btnLanzar   = document.getElementById('btn-lanzar');
  const btnTerminar = document.getElementById('btn-terminar');
  const turnInfo    = document.getElementById('turn-info');

  if (!estado.dadosLanzados) {
    btnLanzar.disabled   = false;
    btnTerminar.disabled = true;
    turnInfo.textContent = 'Lanza los dados';
  } else {
    btnLanzar.disabled   = true;
    btnTerminar.disabled = false;
    turnInfo.textContent = `Revelaciones: ${estado.revelaciones}/2`;
  }

  actualizarRevelacionesDots();
}

/** Actualiza los puntitos de revelación. */
function actualizarRevelacionesDots() {
  const count = document.getElementById('rev-count');
  const dot1  = document.getElementById('rev-dot-1');
  const dot2  = document.getElementById('rev-dot-2');

  count.textContent = estado.revelaciones;
  dot1.classList.toggle('used', estado.revelaciones >= 1);
  dot2.classList.toggle('used', estado.revelaciones >= 2);
}

// ── Lanzar Dados ─────────────────────────────────────

/**
 * Lanza los dos dados con animación y actualiza el estado.
 */
function lanzarDados() {
  if (estado.dadosLanzados) return;

  const d1 = document.getElementById('dado1');
  const d2 = document.getElementById('dado2');

  // Animación de lanzamiento
  d1.classList.add('rolling');
  d2.classList.add('rolling');
  playSound('lanzar');

  setTimeout(() => {
    const c1 = colorAleatorio();
    const c2 = colorAleatorio();
    estado.dadoColores = [c1, c2];
    estado.dadosUsados   = [false, false];
    estado.dadosLanzados = true;
    estado.turnoActivo   = true;
    estado.revelaciones  = 0;

    // Aplicar colores a los dados
    aplicarColorDado(d1, c1);
    aplicarColorDado(d2, c2);

    d1.classList.remove('rolling');
    d2.classList.remove('rolling');
    d1.classList.add('revealed');
    d2.classList.add('revealed');

    actualizarUI();
    mostrarToast(`🎲 ${nombreColor(c1)} + ${nombreColor(c2)}`, 'turno');
  }, 550);
}

/**
 * Aplica el color al elemento dado.
 */
function aplicarColorDado(el, color) {
  el.dataset.color = color;
  el.textContent   = nombreColor(color).toUpperCase().substring(0, 3);
}

/** Capitaliza el nombre de un color. */
function nombreColor(c) {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function obtenerDadoDisponible(color) {
  if (!estado.dadoColores || !estado.dadosUsados) return -1;
  for (let i = 0; i < estado.dadoColores.length; i++) {
    if (estado.dadoColores[i] === color && !estado.dadosUsados[i]) {
      return i;
    }
  }
  return -1;
}

// ── Lógica de clic sobre perrito ─────────────────────

/**
 * Maneja cuando el jugador hace clic sobre un perrito.
 */
function manejarClicPerrito(idPerrito, elemento) {
  // Validaciones
  if (!estado.dadosLanzados) {
    mostrarToast('⚠️ Primero lanza los dados', 'fallo');
    return;
  }
  if (estado.revelaciones >= MAX_REVELACIONES) {
    mostrarToast('🚫 Ya usaste tus 2 revelaciones', 'fallo');
    return;
  }

  // Evitar doble clic durante animación
  if (elemento.classList.contains('revelando') || elemento.classList.contains('capturando')) return;

  const perrito = estado.perritos.find(p => p.id === idPerrito);
  if (!perrito) return;

  const jugadorActual = estado.turnoActual;
  const esPropio = perrito.dueno === jugadorActual;

  if (!esPropio) {
    // Contar revelación INMEDIATAMENTE solo si no es de este jugador
    estado.revelaciones++;
    actualizarUI();
  }
  playSound('revelar');

  // Animación: mostrar lengua
  elemento.classList.add('revelando');

  setTimeout(() => {
    const colorPerrito = perrito.color;
    const duenoActual  = perrito.dueno;
    const dadoDisponible = obtenerDadoDisponible(colorPerrito);
    const coincide = dadoDisponible !== -1;

    if (coincide) {
      if (duenoActual !== jugadorActual) {
        estado.dadosUsados[dadoDisponible] = true;
      }

      if (duenoActual === jugadorActual) {
        // Ya es tuyo; no pasa nada especial
        elemento.classList.remove('revelando');
      } else if (duenoActual === null) {
        // Del tablero → capturar
        elemento.classList.remove('revelando');
        elemento.classList.add('capturando');
        playSound('captura');
        mostrarToast(`✅ ¡Capturaste un perrito ${colorPerrito}!`, 'exito');
        setTimeout(() => {
          perrito.dueno = jugadorActual;
          renderizarJuego();
          verificarVictoria();
          if (estado.revelaciones >= MAX_REVELACIONES) {
            setTimeout(terminarTurno, 500);
          }
        }, 500);
      } else {
        // De otro jugador → robar
        elemento.classList.remove('revelando');
        elemento.classList.add('capturando');
        playSound('robo');
        mostrarToast(`🦊 ¡Robaste un perrito ${colorPerrito} de ${estado.nombresJugadores[duenoActual]}!`, 'robo');
        setTimeout(() => {
          perrito.dueno = jugadorActual;
          renderizarJuego();
          verificarVictoria();
          if (estado.revelaciones >= MAX_REVELACIONES) {
            setTimeout(terminarTurno, 500);
          }
        }, 500);
      }
    } else {
      const mensaje = estado.dadoColores.includes(colorPerrito)
        ? `❌ El color ${colorPerrito} ya se usó con ese dado` 
        : `❌ Era ${colorPerrito}… No coincide`;
      mostrarToast(mensaje, 'fallo');
      playSound('fallo');
      setTimeout(() => {
        elemento.classList.remove('revelando');
        // Comprobar si ya agotó revelaciones
        if (estado.revelaciones >= MAX_REVELACIONES) {
          setTimeout(terminarTurno, 400);
        }
      }, REVEAL_DURATION);
    }
  }, 300); // pequeño delay para que se vea la lengua antes de evaluar
}

// ── Terminar Turno ────────────────────────────────────

/**
 * Termina el turno actual y pasa al siguiente jugador.
 */
function terminarTurno() {
  if (!estado.dadosLanzados && estado.revelaciones === 0) {
    mostrarToast('⚠️ Primero lanza los dados', 'fallo');
    return;
  }

  // Reset estado de turno
  estado.turnoActual   = (estado.turnoActual + 1) % estado.numJugadores;
  estado.dadosLanzados = false;
  estado.turnoActivo   = false;
  estado.revelaciones  = 0;
  estado.dadoColores   = [null, null];
  estado.dadosUsados   = [false, false];

  // Resetear dados visuales
  const d1 = document.getElementById('dado1');
  const d2 = document.getElementById('dado2');
  d1.removeAttribute('data-color');
  d2.removeAttribute('data-color');
  d1.textContent = '?';
  d2.textContent = '?';
  d1.classList.remove('revealed');
  d2.classList.remove('revealed');

  renderizarJugadores(); // Actualiza resaltado activo
  actualizarUI();
  mostrarToast(`🔄 Turno de ${estado.nombresJugadores[estado.turnoActual]}`, 'turno');
}

// ── Victoria ─────────────────────────────────────────

/**
 * Verifica si algún jugador ha ganado.
 */
function verificarVictoria() {
  for (let j = 0; j < estado.numJugadores; j++) {
    const total = estado.perritos.filter(p => p.dueno === j).length;
    if (total >= GOAL) {
      setTimeout(() => mostrarVictoria(j), 600);
      return;
    }
  }
}

/**
 * Muestra la pantalla de victoria.
 */
function mostrarVictoria(ganador) {
  playSound('victoria');

  const screen = document.getElementById('victory-screen');
  screen.classList.remove('hidden');

  document.getElementById('victory-player-name').textContent =
    `${EMOJIS_JUGADORES[ganador]} ${estado.nombresJugadores[ganador]}`;

  // Marcador final
  const scoresEl = document.getElementById('victory-scores');
  scoresEl.innerHTML = '';
  for (let j = 0; j < estado.numJugadores; j++) {
    const count = estado.perritos.filter(p => p.dueno === j).length;
    const item  = document.createElement('div');
    item.className = `victory-score-item${j === ganador ? ' winner' : ''}`;
    item.textContent = `${EMOJIS_JUGADORES[j]} ${estado.nombresJugadores[j]}: ${count} 🐶`;
    scoresEl.appendChild(item);
  }

  // Confetti
  crearConfetti();
}

/**
 * Crea los elementos de confetti animados.
 */
function crearConfetti() {
  const container = document.getElementById('confetti-container');
  container.innerHTML = '';
  const coloresConf = Object.values(COLOR_HEX);
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = coloresConf[Math.floor(Math.random() * coloresConf.length)];
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${color};
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 2}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
  }
}

// ── Nueva Partida ─────────────────────────────────────

/**
 * Reinicia el juego completamente.
 */
function nuevaPartida() {
  document.getElementById('victory-screen').classList.add('hidden');
  document.getElementById('confetti-container').innerHTML = '';
  iniciarJuego();
}

function actualizarInputsJugadores() {
  const cantidad = Number(document.getElementById('player-count').value);
  const inputs = document.querySelectorAll('.player-name-input');
  inputs.forEach((input, index) => {
    input.classList.toggle('hidden', index >= cantidad);
  });
}

function aplicarConfiguracionJugadores() {
  const cantidad = Number(document.getElementById('player-count').value);
  const nombres = [];

  for (let i = 0; i < cantidad; i++) {
    const input = document.getElementById(`player-name-${i}`);
    const nombre = input.value.trim() || `Jugador ${i + 1}`;
    nombres.push(nombre);
  }

  configuracion.numJugadores = cantidad;
  configuracion.nombresJugadores = nombres;
  iniciarJuego();
}

// ── Toast ─────────────────────────────────────────────

let toastTimeout;

/**
 * Muestra un mensaje flotante temporal.
 * @param {string} msg   - texto del mensaje
 * @param {string} tipo  - 'exito' | 'fallo' | 'robo' | 'turno'
 */
function mostrarToast(msg, tipo = 'turno') {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast show ${tipo}`;

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// ── Sonidos (Web Audio API) ───────────────────────────

let audioCtx;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Reproduce un sonido generado con Web Audio API.
 * @param {string} tipo - 'lanzar' | 'revelar' | 'captura' | 'robo' | 'fallo' | 'victoria'
 */
function playSound(tipo) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (tipo) {
      case 'lanzar':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
        break;

      case 'revelar':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
        break;

      case 'captura': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.frequency.setValueAtTime(784, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
        break;
      }

      case 'robo': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now); osc.stop(now + 0.35);
        break;
      }

      case 'fallo':
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
        break;

      case 'victoria': {
        // Secuencia alegre
        const notas = [523, 659, 784, 1047];
        notas.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + i * 0.12);
          g.gain.setValueAtTime(0.18, now + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
          o.start(now + i * 0.12);
          o.stop(now + i * 0.12 + 0.3);
        });
        return; // ya manejado arriba
      }
    }
  } catch (e) {
    // Silencioso si el navegador bloquea audio sin interacción
  }
}
