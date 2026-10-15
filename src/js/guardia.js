
import { supabase } from '../supabase.js';

const formulario = document.querySelector('#formGuardia');
const cardGuardia = document.querySelector('#cardGuardia');
const cardConfirmacao = document.querySelector('#cardConfirmacao');
const codigoGerado = document.querySelector('#codigoGerado');
const btnCopiar = document.querySelector('#btnCopiar');
const btnInicio = document.querySelector('#btnInicio');
const mensagemCopia = document.querySelector('#mensagemCopia');

const botaoEnviar = formulario.querySelector(
  'button[type="submit"]'
);

formulario.addEventListener('submit', async (event) => {
  console.log('O formulário foi acionado!');
  event.preventDefault();

  const nomeMae = document.querySelector('#nomeMae').value.trim();
  const nomePai = document.querySelector('#nomePai').value.trim();
  const nomeBebe = document.querySelector('#nomeBebe').value.trim();

  const sexoSelecionado = document.querySelector(
    'input[name="sexo"]:checked'
  );

  if (!sexoSelecionado) {
    mensagemCopia.textContent = 'Selecione o sexo do bebê.';
    return;
  }

  botaoEnviar.disabled = true;
  botaoEnviar.textContent = 'Guardando o segredo...';
  mensagemCopia.textContent = '';

  try {
    
const { data: resultado, error } =
  await supabase.functions.invoke("criar-cha", {
    body: {
      nomeMae,
      nomePai,
      nomeBebe: nomeBebe || null,
      sexoBebe: sexoSelecionado.value,
    },
  });

if (error) {
  throw error;
}

if (!resultado?.sucesso || !resultado?.codigo) {
  throw new Error("O servidor não retornou o código do chá.");
}

const data = resultado.codigo;


    // Mantém os dados básicos para compatibilidade local.
    // O banco passa a ser a fonte do cadastro.
    const jogo = {
      codigo: data,
      nomeMae,
      nomePai,
      nomeBebe
    };

    localStorage.setItem('jogoCha', JSON.stringify(jogo));

    codigoGerado.textContent = data;
    cardGuardia.hidden = true;
    cardConfirmacao.hidden = false;
  } catch (error) {
    console.error('Erro ao guardar o segredo:', error);

    mensagemCopia.textContent =
      'Não foi possível guardar o segredo. Verifique sua conexão e tente novamente.';
  } finally {
    botaoEnviar.disabled = false;
    botaoEnviar.textContent = '🔐 Guardar o Segredo';
  }
});

btnCopiar.addEventListener('click', async () => {
  const codigo = codigoGerado.textContent;

  try {
    await navigator.clipboard.writeText(codigo);
    mensagemCopia.textContent = 'Código copiado!';
  } catch {
    mensagemCopia.textContent =
      'Não foi possível copiar automaticamente. Selecione e copie o código acima.';
  }
});

btnInicio.addEventListener('click', () => {
  window.location.href = '/';
});