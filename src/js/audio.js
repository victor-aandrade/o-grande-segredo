// Música e efeitos sonoros gerados no navegador, sem arquivos externos.
let contexto;
let ganhoMusica;
let ganhoEfeitos;
let osciladores = [];
let temporizadorMusica;
let musicaLigada = true;
let efeitosLigados = true;
let volumeMusica = 0.16;
let volumeEfeitos = 0.42;
let notaAtual = 0;
let modoMusica = "aventura";

const melodiaAventura = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 698.46,
  523.25, 659.25, 880.00, 783.99, 659.25, 587.33, 523.25, 392.00];

// Melodia mais rápida e alegre para tocar depois que o segredo for revelado.
const melodiaFesta = [
  783.99, 783.99, 880.00, 1046.5, 1046.5, 880.00, 783.99, 659.25,
  698.46, 698.46, 783.99, 880.00, 880.00, 783.99, 698.46, 587.33,
  659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 523.25,
  587.33, 659.25, 783.99, 880.00, 1046.5, 880.00, 783.99, 659.25
];

function prepararAudio() {
  if (contexto) {
    if (contexto.state === "suspended") contexto.resume();
    return;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  contexto = new AudioContext();
  ganhoMusica = contexto.createGain();
  ganhoEfeitos = contexto.createGain();
  ganhoMusica.gain.value = volumeMusica;
  ganhoEfeitos.gain.value = volumeEfeitos;
  ganhoMusica.connect(contexto.destination);
  ganhoEfeitos.connect(contexto.destination);
  iniciarMusica();
}

function tocarNota(frequencia, duracao = 0.45, tipo = "sine", destino = ganhoMusica, atraso = 0) {
  if (!contexto || !destino) return;
  const inicio = contexto.currentTime + atraso;
  const osc = contexto.createOscillator();
  const envelope = contexto.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(frequencia, inicio);
  envelope.gain.setValueAtTime(0.0001, inicio);
  envelope.gain.exponentialRampToValueAtTime(0.18, inicio + 0.035);
  envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
  osc.connect(envelope);
  envelope.connect(destino);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.03);
}

function iniciarMusica() {
  if (!contexto || temporizadorMusica || !musicaLigada) return;
  tocarProximaNota();
  temporizadorMusica = window.setInterval(tocarProximaNota, modoMusica === "festa" ? 220 : 420);
}

function tocarProximaNota() {
  if (!musicaLigada || !contexto) return;
  const melodia = modoMusica === "festa" ? melodiaFesta : melodiaAventura;
  const duracao = modoMusica === "festa" ? 0.19 : 0.38;
  tocarNota(melodia[notaAtual % melodia.length], duracao, modoMusica === "festa" ? "triangle" : "sine", ganhoMusica);
  if (modoMusica === "festa" && notaAtual % 4 === 0) {
    tocarNota(melodia[(notaAtual + 2) % melodia.length] / 2, 0.3, "sine", ganhoMusica, 0.03);
  } else if (notaAtual % 4 === 0) {
    tocarNota(melodia[(notaAtual + 2) % melodia.length] / 2, 0.65, "triangle", ganhoMusica);
  }
  notaAtual++;
}

function pararMusica() {
  if (temporizadorMusica) window.clearInterval(temporizadorMusica);
  temporizadorMusica = undefined;
}

export function iniciarAudio() {
  prepararAudio();
  if (musicaLigada) iniciarMusica();
}

export function tocarMusicaDaRevelacao() {
  prepararAudio();
  modoMusica = "festa";
  notaAtual = 0;
  pararMusica();
  if (musicaLigada) iniciarMusica();
}

export function efeito(nome) {
  prepararAudio();
  if (!contexto || !efeitosLigados) return;
  const sons = {
    toque: [[660, 0.12], [880, 0.16]],
    bebe: [[660, 0.16], [784, 0.18], [1046.5, 0.28]],
    monstro: [[220, 0.18], [185, 0.25]],
    vitoria: [[523.25, 0.18], [659.25, 0.18], [783.99, 0.2], [1046.5, 0.42]],
    derrota: [[392, 0.2], [330, 0.22], [261.63, 0.35]],
    contagem: [[880, 0.14]],
    revelacao: [[523.25, 0.2], [659.25, 0.2], [783.99, 0.2], [1046.5, 0.6]]
  };
  (sons[nome] || sons.toque).forEach(([freq, dur], i) => {
    tocarNota(freq, dur, nome === "monstro" ? "triangle" : "sine", ganhoEfeitos, i * 0.13);
  });
}

export function configurarAudio() {
  const botaoMusica = document.querySelector("#alternarMusica");
  const botaoEfeitos = document.querySelector("#alternarEfeitos");
  const controleVolume = document.querySelector("#volumeAudio");
  if (!botaoMusica || !botaoEfeitos || !controleVolume) return;

  botaoMusica.addEventListener("click", () => {
    prepararAudio();
    musicaLigada = !musicaLigada;
    if (musicaLigada) iniciarMusica(); else pararMusica();
    botaoMusica.setAttribute("aria-pressed", String(musicaLigada));
    botaoMusica.textContent = musicaLigada ? "♫ Música ligada" : "♫ Música desligada";
  });
  botaoEfeitos.addEventListener("click", () => {
    prepararAudio();
    efeitosLigados = !efeitosLigados;
    botaoEfeitos.setAttribute("aria-pressed", String(efeitosLigados));
    botaoEfeitos.textContent = efeitosLigados ? "♪ Efeitos ligados" : "♪ Efeitos desligados";
  });
  controleVolume.addEventListener("input", () => {
    volumeMusica = Number(controleVolume.value) / 100;
    if (ganhoMusica) ganhoMusica.gain.setTargetAtTime(volumeMusica, contexto.currentTime, 0.04);
  });
  // O navegador só permite iniciar áudio depois de uma interação do visitante.
  document.addEventListener("pointerdown", iniciarAudio, { once: true });
  document.addEventListener("keydown", iniciarAudio, { once: true });
}
