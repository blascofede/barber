// --- Elementos del DOM ---
// Se obtienen referencias a los elementos HTML por su ID para poder interactuar con ellos.
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const winScreen = document.getElementById('win-screen');
const loseScreen = document.getElementById('lose-screen');

const playButton = document.getElementById('play-button');
const pauseButton = document.getElementById('pause-button');
const resumeButton = document.getElementById('resume-button');

const currentScoreDisplay = document.getElementById('current-score');
const timeLeftDisplay = document.getElementById('time-left');
const highScoreDisplay = document.getElementById('high-score');
const dailyCheckMessage = document.getElementById('daily-check-message');

const finalWinScoreDisplay = document.getElementById('final-win-score');
const finalLoseScoreDisplay = document.getElementById('final-lose-score');

const winForm = document.getElementById('win-form');
const loseForm = document.getElementById('lose-form');
const winFormMessage = document.getElementById('win-form-message');
const loseFormMessage = document.getElementById('lose-form-message');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d'); // Contexto 2D para dibujar en el canvas

// --- Constantes del Juego ---
// Definiciones de valores fijos que controlan la física y el comportamiento del juego.
const GAME_DURATION = 60; // Duración del juego en segundos (contrarreloj)
const GRAVITY = 0.5; // Fuerza de la gravedad (ajustada para una caída controlable y alto)
const JUMP_VELOCITY = -18; // Velocidad inicial de salto (AJUSTADA para un salto equilibrado, ni muy alto ni muy bajo)
const PLAYER_SPEED = 5;    // Velocidad de movimiento horizontal del personaje (ajustada para buen control)
const PLAYER_WIDTH = 45;   // Ancho del personaje en píxeles
const PLAYER_HEIGHT = 45;  // Alto del personaje en píxeles
const PLATFORM_COUNT = 8;  // Número de plataformas que se mantienen en pantalla
const PLATFORM_WIDTH = 90; // Ancho de las plataformas (más anchas para facilitar el aterrizaje)
const PLATFORM_HEIGHT = 15; // Alto de las plataformas
const POWERUP_SIZE = 35;   // Tamaño de los power-ups
const MIN_PLATFORM_GAP = 120; // Mínimo espacio vertical entre plataformas (AJUSTADO al nuevo salto)
const MAX_PLATFORM_GAP = 200; // Máximo espacio vertical entre plataformas (AJUSTADO al nuevo salto)
const MOBILE_PLATFORM_SPEED = 1.8; // Velocidad de las plataformas móviles (ajustada para mayor dinamismo)
const POWERUP_JUMP_BOOST = -25; // Salto adicional al recoger un power-up (MUY potente, asegura ascenso)
const POWERUP_SCORE_VALUE = 1; // Puntos que suma cada power-up (según tu petición: +1 punto)
const SCROLL_THRESHOLD = 0.4; // Umbral de la pantalla para iniciar el scroll (40% desde arriba del canvas)

// --- Variables de Estado del Juego ---
// Almacenan el estado actual del juego y sus elementos.
let player = {
    x: 0,           // Posición X del personaje en el canvas
    y: 0,           // Posición Y del personaje en el canvas
    vx: 0,          // Velocidad horizontal (velocity x)
    vy: 0,          // Velocidad vertical (velocity y)
    onPlatform: false, // Indica si el personaje está actualmente sobre una plataforma
    movingLeft: false, // True si el personaje se está moviendo a la izquierda
    movingRight: false, // True si el personaje se está moviendo a la derecha
    lastDirection: 'right' // Última dirección para decidir qué imagen de personaje dibujar
};
let platforms = []; // Array para almacenar los objetos de plataforma
let powerups = [];  // Array para almacenar los objetos de power-up
let score = 0;      // Puntuación actual del jugador en la partida
let highScore = 0;  // Récord histórico de puntos guardado localmente
let timeLeft = GAME_DURATION; // Tiempo restante del juego
let gameInterval;   // Variable para el temporizador (setInterval)
let gameRunning = false; // Bandera: True si el juego está en curso
let paused = false;     // Bandera: True si el juego está en pausa
let gameOver = false;   // Bandera: True si el juego ha terminado
let animationFrameId; // ID del frame de animación (para requestAnimationFrame)
let lastPlayerY = 0; // Para la lógica de colisión predictiva

// --- Carga de Imágenes ---
// Se crean objetos Image y se asignan sus rutas. El juego solo comenzará una vez
// que todas las imágenes necesarias estén cargadas.
const playerImageRight = new Image();
playerImageRight.src = 'assets/personaje.png'; // Darío moviéndose a la derecha
const playerImageLeft = new Image();
playerImageLeft.src = 'assets/personaje2.png'; // Darío moviéndose a la izquierda
const scissorsImage = new Image();
scissorsImage.src = 'assets/tijeras.png'; // Power-up de tijeras
const razorImage = new Image();
razorImage.src = 'assets/navaja.png'; // Power-up de navaja

let imagesLoadedCount = 0; // Contador de imágenes cargadas
const totalImages = 4; // Número total de imágenes que se esperan cargar

/**
 * Función que se ejecuta cada vez que una imagen termina de cargar.
 * Cuando todas las imágenes han cargado, se realiza la verificación diaria para jugar.
 */
function imageLoaded() {
    imagesLoadedCount++;
    if (imagesLoadedCount === totalImages) {
        console.log('Todas las imágenes cargadas.');
        checkDailyPlay(); // Verificar si el usuario puede jugar hoy
    }
}

// Asignar la función `imageLoaded` al evento `onload` de cada objeto Image.
playerImageRight.onload = imageLoaded;
playerImageLeft.onload = imageLoaded;
scissorsImage.onload = imageLoaded;
razorImage.onload = imageLoaded;

// --- Funciones de Utilidad ---

/**
 * Genera un número entero aleatorio entre `min` y `max` (inclusive).
 * @param {number} min - El valor mínimo posible.
 * @param {number} max - El valor máximo posible.
 * @returns {number} Un número entero aleatorio.
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Muestra una pantalla específica y oculta las demás.
 * Es crucial para la navegación entre la interfaz de usuario del juego.
 * @param {HTMLElement} screenToShow - El elemento DOM de la pantalla que se debe mostrar.
 */
function showScreen(screenToShow) {
    // Recorre todas las posibles pantallas y les quita la clase 'active' para ocultarlas.
    [startScreen, gameScreen, pauseOverlay, winScreen, loseScreen].forEach(screen => {
        screen.classList.remove('active');
    });
    // Añade la clase 'active' a la pantalla deseada para hacerla visible.
    screenToShow.classList.add('active');
}

// --- Lógica de LocalStorage ---

/**
 * Guarda el récord de puntos actual en el LocalStorage del navegador.
 */
function saveHighScore() {
    localStorage.setItem('darioBarberHighScore', highScore);
}

/**
 * Carga el récord de puntos desde el LocalStorage.
 * Si no hay un récord guardado, `highScore` se mantiene en 0.
 */
function loadHighScore() {
    const storedHighScore = localStorage.getItem('darioBarberHighScore');
    if (storedHighScore) {
        highScore = parseInt(storedHighScore, 10); // Convierte el string almacenado a un número entero.
        highScoreDisplay.textContent = highScore; // Actualiza el display del récord.
    }
}

/**
 * Obtiene la fecha actual en formato "YYYY-MM-DD".
 * Utilizado para la restricción de juego diario.
 * @returns {string} La fecha actual formateada.
 */
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Los meses son de 0 a 11, se suma 1.
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Verifica si el usuario puede jugar hoy comparando la fecha actual con la última fecha de juego
 * registrada en LocalStorage. Si ya jugó hoy, deshabilita el botón de jugar.
 */
function checkDailyPlay() {
    const lastPlayedDate = localStorage.getItem('darioBarberLastPlayedDate');
    const today = getTodayDate();

    if (lastPlayedDate === today) {
        playButton.disabled = true; // Deshabilita el botón "Jugar"
        dailyCheckMessage.textContent = 'Ya jugaste hoy. ¡Vuelve mañana para seguir divirtiéndote!';
    } else {
        playButton.disabled = false; // Habilita el botón "Jugar"
        dailyCheckMessage.textContent = ''; // Limpia el mensaje si el usuario puede jugar.
        loadHighScore(); // Cargar el high score al inicio del juego.
    }
}

/**
 * Registra la fecha actual en LocalStorage como el último día en que el juego fue jugado.
 * Esto se hace al finalizar una partida.
 */
function recordDailyPlay() {
    const today = getTodayDate();
    localStorage.setItem('darioBarberLastPlayedDate', today);
}

// --- Lógica del Canvas y Juego ---

/**
 * Ajusta el tamaño del canvas para que sea responsivo al tamaño de la ventana del navegador.
 * Mantiene el canvas dentro de su contenedor y deja espacio para la interfaz de usuario y el botón de pausa.
 */
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    // Calcula la altura del canvas para que se ajuste al espacio disponible,
    // restando la altura de la UI, el botón de pausa y un margen extra.
    canvas.height = container.clientHeight - gameScreen.querySelector('.game-ui').offsetHeight - pauseButton.offsetHeight - 30;

    // Asegura que el personaje no se salga de la pantalla si el canvas se achica
    player.y = Math.min(player.y, canvas.height - PLAYER_HEIGHT);
}

/**
 * Crea una nueva plataforma. Puede ser fija o móvil.
 * @param {number} y - Posición Y inicial de la plataforma.
 * @param {boolean} isStartingPlatform - Si es true, la plataforma será fija (usada para la primera plataforma).
 * @returns {object} Un objeto que representa la plataforma con sus propiedades.
 */
function createPlatform(y, isStartingPlatform = false) {
    // Determina el tipo de plataforma: fija (70% de probabilidad) o móvil (30%),
    // o siempre fija si es la plataforma inicial.
    const type = isStartingPlatform ? 'fixed' : (Math.random() < 0.7 ? 'fixed' : 'mobile');
    const x = getRandomInt(0, canvas.width - PLATFORM_WIDTH); // Posición X aleatoria dentro del canvas.
    return {
        x: x,
        y: y,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: type,
        // Asigna una velocidad horizontal si es móvil, aleatoriamente izquierda o derecha.
        vx: (type === 'mobile' ? (Math.random() < 0.5 ? MOBILE_PLATFORM_SPEED : -MOBILE_PLATFORM_SPEED) : 0),
    };
}

/**
 * Inicializa las plataformas y posiciona al personaje al inicio de cada partida.
 * Asegura que el personaje siempre comience en una plataforma fija en la parte inferior.
 */
function initializePlatforms() {
    platforms = []; // Vacía el array de plataformas de partidas anteriores
    powerups = [];  // Vacía el array de power-ups
    score = 0;      // Reinicia la puntuación

    // 1. Crear la plataforma inicial (siempre fija) cerca de la parte inferior del canvas.
    const startPlatformY = canvas.height - 50; // A 50px del borde inferior del canvas.
    const startPlatform = createPlatform(startPlatformY, true); // true para que sea fija.
    platforms.push(startPlatform);

    // 2. Posicionar al personaje **exactamente** encima de la plataforma inicial.
    player.x = startPlatform.x + (startPlatform.width / 2) - (PLAYER_WIDTH / 2);
    player.y = startPlatform.y - PLAYER_HEIGHT;
    player.vy = JUMP_VELOCITY; // El personaje comienza saltando inmediatamente.
    player.onPlatform = true; // Indica que está sobre una plataforma.

    // 3. Generar el resto de plataformas por encima de la inicial.
    let currentY = startPlatform.y;
    for (let i = 0; i < PLATFORM_COUNT - 1; i++) {
        // Calcula la posición Y de la nueva plataforma, más alta que la anterior.
        currentY -= getRandomInt(MIN_PLATFORM_GAP, MAX_PLATFORM_GAP);
        const newPlatform = createPlatform(currentY);
        platforms.push(newPlatform);

        // Posibilidad de agregar un power-up en esta nueva plataforma (30% de probabilidad).
        // Asegurarse de que no haya demasiados power-ups cerca al inicio.
        if (Math.random() < 0.4) { // Aumentar probabilidad de power-ups a 40%
            powerups.push({
                x: newPlatform.x + getRandomInt(0, newPlatform.width - POWERUP_SIZE),
                y: newPlatform.y - POWERUP_SIZE,
                size: POWERUP_SIZE,
                type: Math.random() < 0.5 ? 'scissors' : 'razor' // Aleatoriamente tijeras o navaja.
            });
        }
    }
    // Ordenar las plataformas por su coordenada Y de forma ascendente (las más altas primero).
    // Esto es crucial para la lógica de generación y la detección de colisiones.
    platforms.sort((a, b) => a.y - b.y);
}

/**
 * Dibuja al personaje en el canvas, seleccionando la imagen según su dirección de movimiento.
 */
function drawPlayer() {
    let playerImage = playerImageRight; // Imagen por defecto (Darío mirando a la derecha)
    if (player.movingLeft) {
        playerImage = playerImageLeft; // Si se mueve a la izquierda, usa la imagen correspondiente.
    } else if (player.movingRight) {
        playerImage = playerImageRight; // Si se mueve a la derecha, usa la imagen correspondiente.
    } else {
        // Si no se está moviendo, mantiene la última dirección conocida.
        playerImage = player.lastDirection === 'left' ? playerImageLeft : playerImageRight;
    }
    ctx.drawImage(playerImage, player.x, player.y, PLAYER_WIDTH, PLAYER_HEIGHT);
}

/**
 * Dibuja todas las plataformas en el canvas con un estilo de barbería (marrón y borde).
 */
function drawPlatforms() {
    ctx.fillStyle = '#6F4E37'; // Color de madera para plataformas (marrón cálido)
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height); // Dibuja el cuerpo de la plataforma.
        ctx.strokeStyle = '#4A3222'; // Borde más oscuro para un efecto "pixel art" o 3D simple.
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height); // Dibuja el borde de la plataforma.
    });
}

/**
 * Dibuja todos los power-ups (tijeras o navajas) en el canvas.
 */
function drawPowerups() {
    powerups.forEach(pu => {
        let puImage = pu.type === 'scissors' ? scissorsImage : razorImage; // Selecciona la imagen según el tipo de power-up.
        ctx.drawImage(puImage, pu.x, pu.y, pu.size, pu.size);
    });
}

/**
 * Actualiza la lógica del juego en cada fotograma: movimiento del personaje,
 * aplicación de gravedad, desplazamiento del mundo (scrolling), colisiones,
 * y generación de nuevos elementos.
 */
function update() {
    if (paused || gameOver) return; // No actualizar si el juego está pausado o terminado.

    lastPlayerY = player.y; // Guarda la posición Y anterior del jugador para la colisión predictiva.

    // --- Movimiento y Gravedad del Jugador ---
    player.vy += GRAVITY; // Aplicar gravedad, aumentando la velocidad de caída.
    player.y += player.vy; // Mover personaje verticalmente según su velocidad.
    player.x += player.vx; // Mover personaje horizontalmente.

    // Efecto "salto por un lado y aparece por el otro" (screen wrapping horizontal).
    if (player.x + PLAYER_WIDTH < 0) {
        player.x = canvas.width; // Si sale por la izquierda, aparece por la derecha.
    } else if (player.x > canvas.width) {
        player.x = -PLAYER_WIDTH; // Si sale por la derecha, aparece por la izquierda.
    }

    // --- Lógica de Desplazamiento Vertical (Scrolling del Mundo) ---
    let scrollAmount = 0;
    // Si el jugador sube por encima del umbral (ej: 40% de la altura del canvas desde arriba).
    // Y el mapa desciende MÁS LENTO si el jugador está más abajo, y MÁS RÁPIDO si está más arriba
    if (player.y < canvas.height * SCROLL_THRESHOLD) {
        scrollAmount = (canvas.height * SCROLL_THRESHOLD - player.y) * 0.4; // Multiplicador para velocidad de descenso (AJUSTADO: más lento)
        player.y = canvas.height * SCROLL_THRESHOLD; // Mantiene la posición Y del jugador "fija" en el punto de scroll.
        score += Math.round(scrollAmount / 10); // Aumentar puntuación por subir.
    }

    // Aplicar el `scrollAmount` a todas las plataformas y power-ups. Esto simula que
    // el mundo se mueve hacia abajo mientras el personaje sube.
    platforms.forEach(p => {
        p.y += scrollAmount; // Mueve las plataformas hacia abajo.
        if (p.type === 'mobile') {
            p.x += p.vx; // Mueve las plataformas móviles horizontalmente.
            // Rebotar plataformas móviles en los bordes del canvas.
            if (p.x <= 0 || p.x + p.width >= canvas.width) {
                p.vx *= -1; // Invierte la dirección horizontal.
            }
        }
    });
    powerups.forEach(pu => {
        pu.y += scrollAmount; // Mueve los power-ups hacia abajo junto con las plataformas.
    });

    // --- Gestión de Plataformas y Power-ups (Eliminar y Generar) ---
    // Filtrar plataformas que han salido de la pantalla por la parte inferior.
    platforms = platforms.filter(p => p.y < canvas.height + PLATFORM_HEIGHT);
    // Filtrar power-ups que han salido de la pantalla por la parte inferior.
    powerups = powerups.filter(pu => pu.y < canvas.height + POWERUP_SIZE);

    // Generar nuevas plataformas en la parte superior cuando el número total desciende.
    while (platforms.length < PLATFORM_COUNT) {
        // Encontrar la plataforma más alta actual para generar la nueva por encima.
        const highestPlatformY = platforms.length > 0 ? platforms[0].y : 0; // Plataforma más alta es la primera en el array ordenado.
        const newY = highestPlatformY - getRandomInt(MIN_PLATFORM_GAP, MAX_PLATFORM_GAP);
        const newPlatform = createPlatform(newY);
        platforms.unshift(newPlatform); // Añadir al principio para mantener el orden por Y descendente en el array.
    }

    // --- Detección de Colisión Jugador-Plataforma Mejorada ---
    player.onPlatform = false; // Resetear el estado de estar en plataforma cada frame.
    let landedThisFrame = false; // Bandera para asegurar que solo se aterrice una vez por frame.

    platforms.forEach(p => {
        // Colisión horizontal: el personaje se superpone horizontalmente con la plataforma.
        const horizontalOverlap = player.x + PLAYER_WIDTH > p.x && player.x < p.x + p.width;

        // Condición de aterrizaje:
        // 1. El jugador está cayendo (player.vy >= 0).
        // 2. Hay superposición horizontal con la plataforma.
        // 3. El pie del jugador estaba por encima o en el nivel de la plataforma en el frame anterior (lastPlayerY).
        // 4. El pie del jugador está ahora en o por debajo del nivel de la plataforma (player.y).
        // 5. No ha aterrizado ya en otra plataforma en este mismo frame.
        if (player.vy >= 0 && horizontalOverlap &&
            lastPlayerY + PLAYER_HEIGHT <= p.y && // Predice si el jugador *pasó* la parte superior de la plataforma
            player.y + PLAYER_HEIGHT > p.y && !landedThisFrame) { // Confirma que ahora está sobre la plataforma

            player.y = p.y - PLAYER_HEIGHT; // Ajusta la posición del jugador justo encima de la plataforma.
            player.vy = JUMP_VELOCITY; // Impulsa al jugador hacia arriba (salto constante).
            player.onPlatform = true; // Marca que el jugador está en una plataforma.
            landedThisFrame = true; // Marca que ya ha aterrizado en este frame para evitar múltiples saltos.

            // Si la plataforma es móvil, ajusta la posición horizontal del jugador para que se mueva con ella.
            if (p.type === 'mobile') {
                player.x += p.vx;
            }
        }
    });

    // --- Detección de Colisión Jugador-Powerup (¡REVISADO!) ---
    for (let i = powerups.length - 1; i >= 0; i--) {
        const pu = powerups[i];
        // Colisión de bounding box
        if (player.x < pu.x + pu.size &&
            player.x + PLAYER_WIDTH > pu.x &&
            player.y < pu.y + pu.size &&
            player.y + PLAYER_HEIGHT > pu.y) {
            
            console.log('Power-up recogido! Catapulta +1 punto.'); // Mensaje de depuración
            score += POWERUP_SCORE_VALUE; // Suma +1 punto
            player.vy = JUMP_VELOCITY + POWERUP_JUMP_BOOST; // CATAPULTA al personaje más lejos

            powerups.splice(i, 1); // Elimina el power-up recolectado
        }
    }


    // Si el jugador no está en ninguna plataforma y está cayendo al límite del canvas, Game Over
    if (player.y > canvas.height) {
        endGame(false); // Si el jugador cae por debajo del canvas, el juego termina (derrota).
    }

    // Actualizar el récord de puntos si la puntuación actual es mayor.
    if (score > highScore) {
        highScore = score;
        saveHighScore();
    }
}

/**
 * Dibuja todos los elementos visibles en el canvas en cada fotograma.
 */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpia todo el canvas para redibujar.
    // El fondo del canvas con la imagen de barbería ya está definido por CSS.

    drawPlatforms(); // Dibuja las plataformas.
    drawPowerups();  // Dibuja los power-ups.
    drawPlayer();    // Dibuja al personaje.

    // Actualiza los displays de la interfaz de usuario con los valores actuales.
    currentScoreDisplay.textContent = score;
    highScoreDisplay.textContent = highScore;
}

/**
 * El bucle principal del juego. Utiliza `requestAnimationFrame` para una animación suave
 * y eficiente. Se ejecuta repetidamente mientras el juego está activo y no pausado.
 */
function gameLoop() {
    if (!gameRunning || paused || gameOver) {
        cancelAnimationFrame(animationFrameId); // Detiene el bucle si el juego no debe estar activo.
        return;
    }
    update(); // Llama a la función de actualización de la lógica del juego.
    draw();   // Llama a la función de dibujo.
    animationFrameId = requestAnimationFrame(gameLoop); // Solicita el siguiente fotograma.
}

/**
 * Inicia el temporizador del juego.
 */
function startTimer() {
    timeLeft = GAME_DURATION; // Reinicia el tiempo restante.
    timeLeftDisplay.textContent = `${timeLeft}s`; // Actualiza el display del tiempo.
    // Configura un intervalo para decrementar el tiempo cada segundo.
    gameInterval = setInterval(() => {
        if (!paused && gameRunning) { // Solo si el juego está corriendo y no pausado.
            timeLeft--; // Decrementa el tiempo.
            timeLeftDisplay.textContent = `${timeLeft}s`; // Actualiza el display.
            if (timeLeft <= 0) {
                clearInterval(gameInterval); // Detiene el temporizador.
                endGame(true); // El juego termina y el jugador gana por tiempo.
            }
        }
    }, 1000); // 1000 milisegundos = 1 segundo.
}

/**
 * Pausa el juego y muestra la pantalla de pausa.
 */
function pauseGame() {
    paused = true;
    showScreen(pauseOverlay); // Muestra el overlay de pausa.
    cancelAnimationFrame(animationFrameId); // Detiene el bucle de animación para "congelar" el juego.
}

/**
 * Reanuda el juego desde la pantalla de pausa.
 */
function resumeGame() {
    paused = false;
    showScreen(gameScreen); // Oculta el overlay de pausa y muestra la pantalla de juego.
    gameLoop(); // Reanuda el bucle de animación.
}

/**
 * Termina el juego, mostrando la pantalla de victoria o derrota según el resultado.
 * También registra la fecha de juego en LocalStorage.
 * @param {boolean} win - True si el juego terminó en victoria, false si fue derrota.
 */
function endGame(win) {
    gameOver = true;     // Marca el juego como terminado.
    gameRunning = false; // Detiene la bandera de juego en curso.
    clearInterval(gameInterval); // Detiene el temporador.
    cancelAnimationFrame(animationFrameId); // Asegura que el bucle de animación se detenga.

    if (win) {
        finalWinScoreDisplay.textContent = score; // Muestra la puntuación final en la pantalla de victoria.
        showScreen(winScreen); // Muestra la pantalla de victoria.
    } else {
        finalLoseScoreDisplay.textContent = score; // Muestra la puntuación final en la pantalla de derrota.
        showScreen(loseScreen); // Muestra la pantalla de derrota.
    }
    recordDailyPlay(); // Registra que el usuario ha jugado hoy.
}

/**
 * Inicializa un nuevo juego: reinicia puntuación, tiempo, personaje y plataformas.
 * Se llama al presionar el botón "Jugar".
 */
function initGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    gameRunning = true;
    paused = false;
    gameOver = false;

    // Resetear la velocidad horizontal del jugador
    player.vx = 0;
    // player.vy se inicializa en initializePlatforms para el salto inicial.
    player.onPlatform = false;
    player.movingLeft = false;
    player.movingRight = false;
    player.lastDirection = 'right'; // Dirección por defecto al inicio.
    lastPlayerY = 0; // Resetear la posición Y anterior.

    initializePlatforms(); // Llama a la función para inicializar las plataformas y el personaje.

    currentScoreDisplay.textContent = score; // Actualiza la puntuación en la UI.
    timeLeftDisplay.textContent = `${timeLeft}s`; // Actualiza el tiempo en la UI.
    highScoreDisplay.textContent = highScore; // Muestra el récord en la UI (puede ser el mismo que antes).

    showScreen(gameScreen); // Muestra la pantalla de juego.
    startTimer(); // Inicia el temporizador de la partida.
    gameLoop(); // Inicia el bucle de animación del juego.
}

// --- Event Listeners ---

// Listener para el botón "Jugar" en la pantalla de inicio.
playButton.addEventListener('click', () => {
    // Doble verificación de la restricción de juego diario antes de iniciar.
    const lastPlayedDate = localStorage.getItem('darioBarberLastPlayedDate');
    const today = getTodayDate();

    if (lastPlayedDate === today) {
        dailyCheckMessage.textContent = 'Ya jugaste hoy. ¡Vuelve mañana para seguir divirtiéndote!';
        playButton.disabled = true; // Deshabilita el botón si ya jugó.
    } else {
        initGame(); // Si el usuario puede jugar, inicia el juego.
    }
});

// Listener para el botón "Pausa".
pauseButton.addEventListener('click', pauseGame);

// Listener para el botón "Continuar" en la pantalla de pausa.
resumeButton.addEventListener('click', resumeGame);

// Eventos de teclado para movimiento (útil para depuración en desktop).
document.addEventListener('keydown', (e) => {
    if (gameRunning && !paused && !gameOver) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            player.vx = -PLAYER_SPEED;
            player.movingLeft = true;
            player.lastDirection = 'left';
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            player.vx = PLAYER_SPEED;
            player.movingRight = true;
            player.lastDirection = 'right';
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (gameRunning && !paused && !gameOver) {
        if ((e.key === 'ArrowLeft' || e.key === 'a') && player.movingLeft) {
            player.vx = 0;
            player.movingLeft = false;
        } else if ((e.key === 'ArrowRight' || e.key === 'd') && player.movingRight) {
            player.vx = 0;
            player.movingRight = false;
        }
    }
});

// Eventos de toque para movimiento (específicos para dispositivos móviles).
// Se usa el canvas como el área de control táctil.
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del navegador (scroll, zoom).
    if (gameRunning && !paused && !gameOver) {
        // Calcula la posición X del toque relativa al canvas.
        const touchX = e.touches[0].clientX;
        const canvasRect = canvas.getBoundingClientRect();
        const touchRelativeX = touchX - canvasRect.left;

        // Si el toque es en la mitad izquierda del canvas, mueve el personaje a la izquierda.
        if (touchRelativeX < canvas.width / 2) {
            player.vx = -PLAYER_SPEED;
            player.movingLeft = true;
            player.movingRight = false;
            player.lastDirection = 'left';
        } else { // Si el toque es en la mitad derecha, mueve el personaje a la derecha.
            player.vx = PLAYER_SPEED;
            player.movingRight = true;
            player.movingLeft = false;
            player.lastDirection = 'right';
        }
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto.
    if (gameRunning && !paused && !gameOver) {
        // Detiene el movimiento solo si no hay otros toques activos en la pantalla.
        // Esto es importante para que el jugador deje de moverse si levanta todos los dedos.
        if (e.touches.length === 0) {
            player.vx = 0;
            player.movingLeft = false;
            player.movingRight = false;
        }
    }
});

// Listener para el toque continuo, permite "arrastrar" el dedo para mover
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Previene el comportamiento por defecto del navegador (scroll, zoom).
    if (gameRunning && !paused && !gameOver && e.touches.length > 0) {
        const touchX = e.touches[0].clientX;
        const canvasRect = canvas.getBoundingClientRect();
        const touchRelativeX = touchX - canvasRect.left;

        if (touchRelativeX < canvas.width / 2) {
            player.vx = -PLAYER_SPEED;
            player.movingLeft = true;
            player.movingRight = false;
            player.lastDirection = 'left';
        } else {
            player.vx = PLAYER_SPEED;
            player.movingRight = true;
            player.movingLeft = false;
            player.lastDirection = 'right';
        }
    }
});


// --- Envío de Formularios a Google Sheets (a través de Google Apps Script) ---
/**
 * Envía los datos del formulario (ya sea de victoria o derrota) a una planilla de Google Sheets.
 * @param {Event} event - El objeto de evento de envío del formulario.
 * @param {string} formType - Una cadena ('win' o 'lose') para identificar de qué formulario vienen los datos.
 */
async function submitForm(event, formType) {
    event.preventDefault(); // Previene el envío por defecto del formulario (recarga de página).

    const form = event.target;
    const formData = new FormData(form); // Captura los datos de todos los campos del formulario.
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value; // Convierte FormData a un objeto plano.
    });
    // Añade datos adicionales necesarios para el registro, como el tipo de formulario,
    // la puntuación final de la partida y una marca de tiempo.
    data.formType = formType;
    data.score = score;
    data.timestamp = new Date().toISOString(); // Formato ISO para la fecha y hora.

    const formMessageElement = formType === 'win' ? winFormMessage : loseFormMessage;
    formMessageElement.textContent = 'Enviando datos...';
    formMessageElement.style.color = '#f1c40f'; // Mensaje de carga en amarillo.

    // --- IMPORTANTE: Reemplaza esta URL con la URL de tu Web App de Google Apps Script ---
    // Consulta las instrucciones en la sección de "Instrucciones Adicionales" para obtener esta URL.
    const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbyX601r7wxkwjHjC_jC7KtSP3N-spnzT58EbIp5sbrrDaKJOvD_2FHmoN0r88FSQcOgyg/execGOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

    try {
        const response = await fetch(googleAppsScriptURL, {
            method: 'POST',
            mode: 'no-cors', // Fundamental para evitar problemas de CORS con Google Apps Script.
            headers: {
                'Content-Type': 'application/json', // Indica que el cuerpo de la solicitud es JSON.
            },
            body: JSON.stringify(data), // Envía el objeto de datos como una cadena JSON.
        });

        // Debido al modo 'no-cors', no podemos leer la respuesta real del servidor.
        // Por lo tanto, asumimos el éxito si no hay un error de red durante el fetch.
        formMessageElement.textContent = '¡Datos enviados correctamente!';
        formMessageElement.style.color = '#2ecc71'; // Mensaje de éxito en verde.
        form.reset(); // Limpia los campos del formulario.
        // Deshabilita todos los elementos del formulario para evitar envíos múltiples.
        Array.from(form.elements).forEach(element => element.disabled = true);

    } catch (error) {
        console.error('Error al enviar el formulario:', error);
        formMessageElement.textContent = 'Error al enviar los datos. Inténtalo de nuevo.';
        formMessageElement.style.color = '#e74c3c'; // Mensaje de error en rojo.
    }
}

// Asigna la función `submitForm` a los eventos `submit` de ambos formularios.
winForm.addEventListener('submit', (e) => submitForm(e, 'win'));
loseForm.addEventListener('submit', (e) => submitForm(e, 'lose'));

// --- Inicialización al cargar la ventana ---
// Se ejecuta una vez que todo el contenido de la página ha cargado.
window.onload = function() {
    resizeCanvas(); // Ajusta el tamaño del canvas al cargar la página inicialmente.
    checkDailyPlay(); // Realiza la verificación de juego diario.
    // Solo muestra la pantalla de inicio; el juego no comienza automáticamente,
    // sino al presionar el botón "Jugar".
    showScreen(startScreen);
};

// Ajusta el tamaño del canvas cada vez que la ventana cambia de tamaño (responsividad).
window.addEventListener('resize', resizeCanvas);
