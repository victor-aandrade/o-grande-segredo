import { supabase } from "../supabase.js";
import {
  configurarAudio,
  efeito,
  tocarMusicaDaRevelacao,
} from "./audio.js";

// Elementos da página
const campoJogo = document.querySelector("#campoJogo");
const bebêsEncontrados = document.querySelector("#bebesEncontrados");
const tentativasElemento = document.querySelector("#tentativas");
const mensagemJogo = document.querySelector("#mensagemJogo");
const btnReiniciar = document.querySelector("#btnReiniciar");

const telaVitoria = document.querySelector("#telaVitoria");
const btnRevelacao = document.querySelector("#btnRevelacao");

const telaRevelacao = document.querySelector("#telaRevelacao");
const contador = document.querySelector("#contador");
const resultado = document.querySelector("#resultado");
const tituloRevelacao = document.querySelector("#tituloRevelacao");
const nomeBebeRevelacao = document.querySelector("#nomeBebeRevelacao");
const emojiBebe = document.querySelector("#emojiBebe");
const btnInicioRevelacao = document.querySelector("#btnInicioRevelacao");

// Configurações do jogo
const TOTAL_QUADRADOS = 25;
const TOTAL_BEBES = 3;
const TOTAL_TENTATIVAS = 5;

// Estado da partida
let codigo = "";
let partidaId = null;
let quadradosRevelados = new Set();
let encontrados = 0;
let tentativas = TOTAL_TENTATIVAS;
let jogoFinalizado = false;
let operacaoEmAndamento = false;
let temporizadorRevelacao = null;

// Inicializa os recursos de áudio
configurarAudio();

// Inicia o jogo
function iniciarJogo() {
  try {
    const jogoSalvo = localStorage.getItem("jogoCha");

    if (!jogoSalvo) {
      window.location.href = "/jogador.html";
      return;
    }

    const jogo = JSON.parse(jogoSalvo);

    if (!jogo.codigo || !jogo.partidaId) {
      localStorage.removeItem("jogoCha");
      window.location.href = "/jogador.html";
      return;
    }

    codigo = jogo.codigo;
    partidaId = jogo.partidaId;

    prepararTabuleiro();
  } catch (error) {
    console.error("Erro ao carregar o jogo:", error);
    mensagemJogo.textContent =
      "Não foi possível carregar a aventura. Volte e tente novamente.";
  }
}

// Prepara uma nova tentativa da partida atual
function prepararTabuleiro() {
  quadradosRevelados = new Set();
  encontrados = 0;
  tentativas = TOTAL_TENTATIVAS;
  jogoFinalizado = false;
  operacaoEmAndamento = false;

  if (temporizadorRevelacao) {
    clearInterval(temporizadorRevelacao);
    temporizadorRevelacao = null;
  }

  campoJogo.innerHTML = "";
  telaVitoria.hidden = true;
  telaRevelacao.hidden = true;
  campoJogo.hidden = false;
  btnReiniciar.hidden = true;

  atualizarContadores();
  criarCampo();

  mensagemJogo.textContent =
    "Encontre os 3 bebês escondidos sem esgotar suas tentativas!";
}

// Cria os 25 quadrados
function criarCampo() {
  for (let i = 0; i < TOTAL_QUADRADOS; i++) {
    const quadrado = document.createElement("button");

    quadrado.type = "button";
    quadrado.classList.add("quadrado");
    quadrado.dataset.posicao = i;
    quadrado.setAttribute("aria-label", `Quadrado ${i + 1}`);
    quadrado.textContent = "?";

    quadrado.addEventListener("click", () => {
      verificarQuadrado(i, quadrado);
    });

    campoJogo.appendChild(quadrado);
  }
}

// Atualiza os contadores da interface
function atualizarContadores() {
  bebêsEncontrados.textContent = `${encontrados}/${TOTAL_BEBES}`;
  tentativasElemento.textContent = `${tentativas}`;
}

// Faz uma jogada usando a Edge Function do Supabase
async function verificarQuadrado(posicao, quadrado) {
  if (
    jogoFinalizado ||
    operacaoEmAndamento ||
    quadradosRevelados.has(posicao)
  ) {
    return;
  }

  operacaoEmAndamento = true;
  quadrado.disabled = true;
  mensagemJogo.textContent = "A magia está acontecendo...";

  try {
    const { data, error } = await supabase.functions.invoke(
      "jogar-quadrado",
      {
        body: {
          codigo,
          partida_id: partidaId,
          // A interface usa posições de 0 a 24.
          // O banco recebe posições de 1 a 25.
          posicao: posicao + 1,
        },
      }
    );

    if (error) {
      throw error;
    }

    if (!data?.sucesso) {
      throw new Error(
        data?.erro || "Não foi possível registrar a jogada."
      );
    }

    const dadosBanco = data.dados;
    const resposta = Array.isArray(dadosBanco)
      ? dadosBanco[0]
      : dadosBanco;

    if (!resposta) {
      throw new Error("O banco não retornou o resultado do quadrado.");
    }

    quadradosRevelados.add(posicao);

    tentativas = Number(
      resposta.tentativas_restantes ?? tentativas
    );

    encontrados = Number(
      resposta.bebes_encontrados ?? encontrados
    );

    atualizarContadores();

    if (resposta.resultado === "bebe") {
      quadrado.textContent = "👶";
      quadrado.classList.add("quadrado-bebe");
      quadrado.setAttribute(
        "aria-label",
        `Quadrado ${posicao + 1}: bebê encontrado`
      );

      mensagemJogo.textContent = "✨ Você encontrou um bebê!";

      try {
        efeito("bebe");
      } catch (erroAudio) {
        console.warn("Não foi possível reproduzir o efeito:", erroAudio);
      }
    } else {
      quadrado.textContent = "👾";
      quadrado.classList.add("quadrado-monstro");
      quadrado.setAttribute(
        "aria-label",
        `Quadrado ${posicao + 1}: monstro encontrado`
      );

      mensagemJogo.textContent = "👾 Ops! Você encontrou um monstro!";

      try {
        efeito("monstro");
      } catch (erroAudio) {
        console.warn("Não foi possível reproduzir o efeito:", erroAudio);
      }
    }

    // Vitória ou derrota são confirmadas pelo banco
    if (resposta.status_partida === "vitoria") {
      vencerJogo();
    } else if (resposta.status_partida === "derrota") {
      perderJogo();
    } else {
      quadrado.disabled = true;
    }
  } catch (error) {
    console.error("Erro ao registrar a jogada:", error);

    mensagemJogo.textContent =
      error.message ||
      "Não foi possível registrar sua jogada. Tente novamente.";

    // Se a jogada falhou no servidor, permite tentar novamente.
    if (!quadradosRevelados.has(posicao) && !jogoFinalizado) {
      quadrado.disabled = false;
    }
  } finally {
    operacaoEmAndamento = false;
  }
}

// Quando o jogador vence
function vencerJogo() {
  jogoFinalizado = true;
  campoJogo.hidden = true;
  telaVitoria.hidden = false;
  btnReiniciar.hidden = true;

  mensagemJogo.textContent =
    "🎉 Você encontrou todos os bebês! A revelação está chegando!";

  try {
    efeito("vitoria");
  } catch (error) {
    console.warn("Não foi possível reproduzir o efeito:", error);
  }
}

// Quando o jogador perde
function perderJogo() {
  jogoFinalizado = true;
  mensagemJogo.textContent =
    "💫 Suas tentativas acabaram! Você pode tentar novamente.";

  btnReiniciar.hidden = false;

  try {
    efeito("derrota");
  } catch (error) {
    console.warn("Não foi possível reproduzir o efeito:", error);
  }

  // Não revela a localização dos bebês ou dos monstros.
}

// Reinicia a partida usando a Edge Function
btnReiniciar.addEventListener("click", async () => {
  if (operacaoEmAndamento) {
    return;
  }

  operacaoEmAndamento = true;
  btnReiniciar.disabled = true;
  btnReiniciar.textContent = "Reiniciando...";

  try {
    const { data, error } = await supabase.functions.invoke(
      "reiniciar-partida",
      {
        body: {
          codigo,
          partida_id: partidaId,
        },
      }
    );

    if (error) {
      throw error;
    }

    if (!data?.sucesso) {
      throw new Error(
        data?.erro || "O banco não confirmou o reinício."
      );
    }

    // O banco mantém as posições dos bebês nesta mesma partida.
    prepararTabuleiro();
  } catch (error) {
    console.error("Erro ao reiniciar a partida:", error);

    mensagemJogo.textContent =
      "Não foi possível reiniciar a partida. Tente novamente.";
  } finally {
    operacaoEmAndamento = false;
    btnReiniciar.disabled = false;
    btnReiniciar.textContent = "🔄 Tentar novamente";
  }
});

// Confirma e busca o segredo somente após a vitória
btnRevelacao.addEventListener("click", async () => {
  if (!jogoFinalizado || operacaoEmAndamento) {
    return;
  }

  operacaoEmAndamento = true;
  btnRevelacao.disabled = true;
  btnRevelacao.textContent = "Preparando a revelação...";

  try {
    const { data, error } = await supabase.functions.invoke(
      "revelar-segredo",
      {
        body: {
          codigo,
          partida_id: partidaId,
        },
      }
    );

    if (error) {
      throw error;
    }

    if (!data?.sucesso) {
      throw new Error(
        data?.erro || "Não foi possível confirmar a revelação."
      );
    }

    const dadosSegredo = data.dados;
    const segredo = Array.isArray(dadosSegredo)
      ? dadosSegredo[0]
      : dadosSegredo;

    if (!segredo) {
      throw new Error("O banco não retornou o segredo.");
    }

    if (
      segredo.sexo_bebe !== "menino" &&
      segredo.sexo_bebe !== "menina"
    ) {
      throw new Error("O banco retornou um sexo inválido.");
    }

    mostrarContagemRegressiva(segredo);
  } catch (error) {
    console.error("Erro ao buscar a revelação:", error);

    mensagemJogo.textContent =
      error.message ||
      "Não foi possível preparar a revelação. Tente novamente.";
  } finally {
    operacaoEmAndamento = false;
    btnRevelacao.disabled = false;
    btnRevelacao.textContent = "🎁 Revelar o segredo";
  }
});

// Exibe a contagem regressiva
function mostrarContagemRegressiva(segredo) {
  telaVitoria.hidden = true;
  campoJogo.hidden = true;
  telaRevelacao.hidden = false;

  contador.hidden = false;
  resultado.hidden = true;

  let segundos = 3;
  contador.textContent = segundos;

  if (temporizadorRevelacao) {
    clearInterval(temporizadorRevelacao);
  }

  temporizadorRevelacao = setInterval(() => {
    segundos--;

    if (segundos > 0) {
      contador.textContent = segundos;
      return;
    }

    clearInterval(temporizadorRevelacao);
    temporizadorRevelacao = null;

    contador.hidden = true;
    resultado.hidden = false;

    mostrarRevelacao(segredo);
  }, 1000);
}

// Mostra o resultado final
function mostrarRevelacao(segredo) {
  const menino = segredo.sexo_bebe === "menino";

  tituloRevelacao.textContent = menino
    ? "💙 É UM MENINO! 💙"
    : "💖 É UMA MENINA! 💖";

  nomeBebeRevelacao.textContent = segredo.nome_bebe
    ? `O nome escolhido é ${segredo.nome_bebe}!`
    : "";

  emojiBebe.textContent = menino ? "💙" : "💖";

  // Mantém as imagens existentes no projeto.
  emojiBebe.innerHTML = "";

  const imagem = document.createElement("img");
  imagem.src = menino
    ? "/images/bebe-azul.svg"
    : "/images/bebe-rosa.svg";

  imagem.alt = menino ? "Ilustração de um bebê menino" : "Ilustração de uma bebê menina";
  imagem.classList.add("imagem-revelacao");

  emojiBebe.appendChild(imagem);

  try {
    tocarMusicaDaRevelacao();
  } catch (error) {
    console.warn("Não foi possível iniciar a música da revelação:", error);
  }

  try {
    efeito("revelacao");
  } catch (error) {
    console.warn("Não foi possível reproduzir o efeito:", error);
  }
}

// Volta à página inicial
btnInicioRevelacao.addEventListener("click", () => {
  window.location.href = "/";
});

// Inicia a aplicação
iniciarJogo();