const DURACAO_PARTIDA = 20_000;
const INTERVALO_ALVO = 1_200;
const PONTOS_POR_ACERTO = 10;

const areaJogo = document.querySelector('#area-jogo');
const painelJogo = document.querySelector('.painel-jogo');
const telaMensagem = document.querySelector('#tela-mensagem');
const botaoIniciar = document.querySelector('#botao-iniciar');
const textoPontuacao = document.querySelector('#pontuacao');
const textoAcertos = document.querySelector('#acertos');
const textoTempo = document.querySelector('#tempo');
const relogio = document.querySelector('#relogio');
const barraTempo = document.querySelector('#barra-tempo');
const estadoJogo = document.querySelector('#estado-jogo');
const anuncio = document.querySelector('#anuncio');

let partidaAtiva = false;
let pontuacao = 0;
let acertos = 0;
let prazoFinal = 0;
let alvoAtual = null;
let temporizadorAlvo = null;
let temporizadorRelogio = null;
let temporizadorFim = null;

function limparTemporizadores() {
  clearTimeout(temporizadorAlvo);
  clearInterval(temporizadorRelogio);
  clearTimeout(temporizadorFim);
}

function posicionarAlvo() {
  if (!alvoAtual) return;

  // Descontar o tamanho do alvo evita que ele ultrapasse as bordas.
  const limiteHorizontal = Math.max(0, areaJogo.clientWidth - alvoAtual.offsetWidth);
  const limiteVertical = Math.max(0, areaJogo.clientHeight - alvoAtual.offsetHeight);
  alvoAtual.style.left = `${Math.random() * limiteHorizontal}px`;
  alvoAtual.style.top = `${Math.random() * limiteVertical}px`;
}

function criarAlvo() {
  clearTimeout(temporizadorAlvo);
  if (!partidaAtiva) return;
  if (performance.now() >= prazoFinal) {
    encerrarPartida();
    return;
  }

  const manterFoco = alvoAtual !== null && document.activeElement === alvoAtual;
  alvoAtual?.remove();
  alvoAtual = document.createElement('button');
  alvoAtual.type = 'button';
  alvoAtual.className = 'alvo';
  alvoAtual.setAttribute('aria-label', 'Acertar alvo: mais 10 pontos');
  alvoAtual.addEventListener('click', registrarAcerto);
  areaJogo.append(alvoAtual);
  posicionarAlvo();
  if (manterFoco) alvoAtual.focus({ preventScroll: true });

  // Cada novo alvo recebe seu próprio prazo de 1,2 segundo.
  temporizadorAlvo = setTimeout(criarAlvo, INTERVALO_ALVO);
}

function registrarAcerto(evento) {
  if (!partidaAtiva || evento.currentTarget !== alvoAtual) return;
  if (performance.now() >= prazoFinal) {
    encerrarPartida();
    return;
  }

  acertos += 1;
  pontuacao += PONTOS_POR_ACERTO;
  textoPontuacao.textContent = pontuacao;
  textoAcertos.textContent = acertos;
  criarAlvo();
}

function atualizarRelogio() {
  // O relógio real evita acumular atrasos entre execuções do temporizador.
  const tempoRestante = Math.max(0, prazoFinal - performance.now());
  textoTempo.textContent = Math.ceil(tempoRestante / 1_000);
  barraTempo.style.width = `${(tempoRestante / DURACAO_PARTIDA) * 100}%`;
  relogio.classList.toggle('tempo-urgente', tempoRestante <= 5_000);
  if (tempoRestante === 0) encerrarPartida();
}

function iniciarPartida(evento) {
  if (partidaAtiva) return;
  limparTemporizadores();
  pontuacao = 0;
  acertos = 0;
  partidaAtiva = true;
  prazoFinal = performance.now() + DURACAO_PARTIDA;
  textoPontuacao.textContent = '0';
  textoAcertos.textContent = '0';
  telaMensagem.hidden = true;
  painelJogo.classList.add('em-andamento');
  estadoJogo.lastChild.textContent = ' Partida em andamento';
  anuncio.textContent = 'Partida iniciada. Você tem 20 segundos.';
  atualizarRelogio();
  criarAlvo();
  if (evento.detail === 0) alvoAtual.focus({ preventScroll: true });
  temporizadorRelogio = setInterval(atualizarRelogio, 100);
  temporizadorFim = setTimeout(encerrarPartida, DURACAO_PARTIDA);
}

function encerrarPartida() {
  if (!partidaAtiva) return;
  partidaAtiva = false;
  limparTemporizadores();
  alvoAtual?.remove();
  alvoAtual = null;
  textoTempo.textContent = '0';
  barraTempo.style.width = '0%';
  painelJogo.classList.remove('em-andamento');
  estadoJogo.lastChild.textContent = ' Partida encerrada';
  document.querySelector('#etiqueta-tela').textContent = 'TEMPO ESGOTADO';
  document.querySelector('#titulo-mensagem').textContent = `${pontuacao} pontos!`;
  document.querySelector('#descricao-mensagem').textContent = `Você acertou ${acertos} ${acertos === 1 ? 'alvo' : 'alvos'} em 20 segundos. Vamos tentar de novo?`;
  botaoIniciar.firstChild.textContent = 'Jogar novamente ';
  document.querySelector('#dica-inicio').textContent = 'Uma nova partida, uma nova chance de se superar.';
  telaMensagem.hidden = false;
  anuncio.textContent = `Partida encerrada. Pontuação final: ${pontuacao} pontos, ${acertos} ${acertos === 1 ? 'acerto' : 'acertos'}.`;
  botaoIniciar.focus({ preventScroll: true });
}

botaoIniciar.addEventListener('click', iniciarPartida);

// Reposiciona o alvo se a tela for redimensionada durante a partida.
window.addEventListener('resize', () => {
  if (partidaAtiva) posicionarAlvo();
});
