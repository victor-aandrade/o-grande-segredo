
import { supabase } from "../supabase.js";

const formulario = document.querySelector("#formJogador");
const inputCodigo = document.querySelector("#codigo");
const mensagemErro = document.querySelector("#mensagemErro");
const btnVoltar = document.querySelector("#btnVoltar");
const btnComecar = formulario.querySelector('button[type="submit"]');

formulario.addEventListener("submit", async (event) => {
  event.preventDefault();

  const codigoDigitado = inputCodigo.value.trim().toUpperCase();

  mensagemErro.textContent = "";

  if (!/^[A-Z0-9]{6}$/.test(codigoDigitado)) {
    mensagemErro.textContent =
      "❌ Digite um código válido de 6 caracteres.";
    return;
  }

  btnComecar.disabled = true;
  btnComecar.textContent = "Verificando código...";

  try {
    // 1. Validar o código do chá pela Edge Function.
    const { data: resultadoValidacao, error: erroValidacao } =
      await supabase.functions.invoke("validar-codigo", {
        body: {
          codigo: codigoDigitado,
        },
      });

    if (erroValidacao) throw erroValidacao;

    if (
      !resultadoValidacao?.sucesso ||
      !Array.isArray(resultadoValidacao.dados) ||
      resultadoValidacao.dados.length === 0
    ) {
      mensagemErro.textContent =
        "❌ Código não encontrado. Confira e tente novamente.";
      return;
    }

    const aventura = resultadoValidacao.dados[0];

    // 2. Iniciar a partida pela Edge Function.
    btnComecar.textContent = "Preparando a aventura...";

    const { data: resultadoPartida, error: erroPartida } =
      await supabase.functions.invoke("iniciar-partida", {
        body: {
          codigo: codigoDigitado,
        },
      });

    if (erroPartida) throw erroPartida;

    if (
      !resultadoPartida?.sucesso ||
      !Array.isArray(resultadoPartida.dados) ||
      resultadoPartida.dados.length === 0
    ) {
      throw new Error("O banco não retornou os dados da partida.");
    }

    const partida = resultadoPartida.dados[0];

    // 3. Guardar apenas os dados necessários no navegador.
    // Não armazenar o sexo do bebê nem as posições dos quadrados.
    const jogo = {
      codigo: codigoDigitado,
      partidaId: partida.partida_id,
      nomeMae: aventura.nome_mae,
      nomePai: aventura.nome_pai,
      nomeBebe: aventura.nome_bebe || "",
    };

    localStorage.setItem("jogoCha", JSON.stringify(jogo));

    mensagemErro.textContent =
      "✅ Código correto! Preparando a aventura...";

    window.location.href = "/jogo.html";
  } catch (error) {
    console.error("Erro ao preparar a aventura:", error);

    mensagemErro.textContent =
      "❌ Não foi possível iniciar o jogo. Tente novamente.";
  } finally {
    btnComecar.disabled = false;
    btnComecar.textContent = "🚀 Começar aventura";
  }
});

btnVoltar.addEventListener("click", () => {
  window.location.href = "/";
});

inputCodigo.addEventListener("input", () => {
  inputCodigo.value = inputCodigo.value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);

  mensagemErro.textContent = "";
});
