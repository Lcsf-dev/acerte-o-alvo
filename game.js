(() => {
  'use strict';

  const CONFIGURACAO = Object.freeze({
    duracaoPartidaMs: 20_000,
    intervaloAlvoMs: 1_200,
    pontosPorAcerto: 10,
    atualizacaoRelogioMs: 100,
    avisoTempoMs: 5_000,
  });

  const elementos = {
    areaJogo: document.querySelector('#area-jogo'),
    painelJogo: document.querySelector('.painel-jogo'),
    telaMensagem: document.querySelector('#tela-mensagem'),
    botaoIniciar: document.querySelector('#botao-iniciar'),
    textoBotao: document.querySelector('#texto-botao'),
    pontuacao: document.querySelector('#pontuacao'),
    acertos: document.querySelector('#acertos'),
    tempo: document.querySelector('#tempo'),
    relogio: document.querySelector('#relogio'),
    barraTempo: document.querySelector('#barra-tempo'),
    textoEstado: document.querySelector('#texto-estado'),
    anuncio: document.querySelector('#anuncio'),
    etiquetaTela: document.querySelector('#etiqueta-tela'),
    tituloMensagem: document.querySelector('#titulo-mensagem'),
    descricaoMensagem: document.querySelector('#descricao-mensagem'),
    dicaInicio: document.querySelector('#dica-inicio'),
  };

  const partida = {
    ativa: false,
    acertos: 0,
    prazoFinal: 0,
    alvo: null,
  };

  const temporizadores = {
    alvo: null,
    relogio: null,
    encerramento: null,
  };

  function obterPontuacao() {
    // A pontuação é derivada dos acertos para manter uma única fonte de verdade.
    return partida.acertos * CONFIGURACAO.pontosPorAcerto;
  }

  function obterTempoRestante() {
    // O prazo fixo evita acumular atrasos entre execuções dos temporizadores.
    return Math.max(0, partida.prazoFinal - performance.now());
  }

  function limparTemporizadores() {
    clearTimeout(temporizadores.alvo);
    clearInterval(temporizadores.relogio);
    clearTimeout(temporizadores.encerramento);

    temporizadores.alvo = null;
    temporizadores.relogio = null;
    temporizadores.encerramento = null;
  }

  // Atualização da interface.
  function atualizarPlacar() {
    elementos.pontuacao.textContent = obterPontuacao();
    elementos.acertos.textContent = partida.acertos;
  }

  function exibirTempo(tempoRestante) {
    const percentualRestante = (tempoRestante / CONFIGURACAO.duracaoPartidaMs) * 100;

    elementos.tempo.textContent = Math.ceil(tempoRestante / 1_000);
    elementos.barraTempo.style.width = `${percentualRestante}%`;
    elementos.relogio.classList.toggle(
      'tempo-urgente',
      tempoRestante <= CONFIGURACAO.avisoTempoMs,
    );
  }

  function exibirPartida() {
    elementos.telaMensagem.hidden = true;
    elementos.painelJogo.classList.add('em-andamento');
    elementos.textoEstado.textContent = 'Partida em andamento';
    elementos.anuncio.textContent = 'Partida iniciada. Você tem 20 segundos.';

    atualizarPlacar();
    exibirTempo(CONFIGURACAO.duracaoPartidaMs);
  }

  function exibirResultado() {
    const pontuacao = obterPontuacao();
    const nomeAlvos = partida.acertos === 1 ? 'alvo' : 'alvos';
    const nomeAcertos = partida.acertos === 1 ? 'acerto' : 'acertos';

    elementos.painelJogo.classList.remove('em-andamento');
    elementos.textoEstado.textContent = 'Partida encerrada';
    elementos.etiquetaTela.textContent = 'TEMPO ESGOTADO';
    elementos.tituloMensagem.textContent = `${pontuacao} pontos!`;
    elementos.descricaoMensagem.textContent =
      `Você acertou ${partida.acertos} ${nomeAlvos} em 20 segundos. Vamos tentar de novo?`;
    elementos.textoBotao.textContent = 'Jogar novamente';
    elementos.dicaInicio.textContent = 'Uma nova partida, uma nova chance de se superar.';
    elementos.anuncio.textContent =
      `Partida encerrada. Pontuação final: ${pontuacao} pontos, ${partida.acertos} ${nomeAcertos}.`;
    elementos.telaMensagem.hidden = false;

    exibirTempo(0);
    elementos.botaoIniciar.focus({ preventScroll: true });
  }

  // Criação, posicionamento e interação dos alvos.
  function removerAlvo() {
    partida.alvo?.remove();
    partida.alvo = null;
  }

  function posicionarAlvo() {
    if (!partida.alvo) return;

    // Descontar o tamanho do alvo mantém toda a sua área dentro das bordas.
    const limiteHorizontal = Math.max(0, elementos.areaJogo.clientWidth - partida.alvo.offsetWidth);
    const limiteVertical = Math.max(0, elementos.areaJogo.clientHeight - partida.alvo.offsetHeight);

    partida.alvo.style.left = `${Math.random() * limiteHorizontal}px`;
    partida.alvo.style.top = `${Math.random() * limiteVertical}px`;
  }

  function partidaPermiteInteracao() {
    if (!partida.ativa) return false;
    if (obterTempoRestante() > 0) return true;

    encerrarPartida();
    return false;
  }

  function criarAlvo() {
    clearTimeout(temporizadores.alvo);
    if (!partidaPermiteInteracao()) return;

    const manterFoco = partida.alvo !== null && document.activeElement === partida.alvo;
    const alvo = document.createElement('button');

    alvo.type = 'button';
    alvo.className = 'alvo';
    alvo.setAttribute('aria-label', `Acertar alvo: mais ${CONFIGURACAO.pontosPorAcerto} pontos`);
    alvo.addEventListener('click', registrarAcerto);

    removerAlvo();
    partida.alvo = alvo;
    elementos.areaJogo.append(alvo);
    posicionarAlvo();

    if (manterFoco) {
      alvo.focus({ preventScroll: true });
    }

    // Cada novo alvo recebe seu próprio prazo, inclusive após um acerto.
    temporizadores.alvo = setTimeout(criarAlvo, CONFIGURACAO.intervaloAlvoMs);
  }

  function registrarAcerto(evento) {
    if (evento.currentTarget !== partida.alvo || !partidaPermiteInteracao()) return;

    partida.acertos += 1;
    atualizarPlacar();
    criarAlvo();
  }

  // Ciclo de vida da partida.
  function atualizarRelogio() {
    if (!partida.ativa) return;

    const tempoRestante = obterTempoRestante();
    exibirTempo(tempoRestante);

    if (tempoRestante === 0) {
      encerrarPartida();
    }
  }

  function iniciarPartida(evento) {
    if (partida.ativa) return;

    limparTemporizadores();
    partida.acertos = 0;
    partida.ativa = true;
    partida.prazoFinal = performance.now() + CONFIGURACAO.duracaoPartidaMs;

    exibirPartida();
    criarAlvo();

    if (evento.detail === 0) {
      partida.alvo.focus({ preventScroll: true });
    }

    temporizadores.relogio = setInterval(atualizarRelogio, CONFIGURACAO.atualizacaoRelogioMs);
    temporizadores.encerramento = setTimeout(encerrarPartida, obterTempoRestante());
  }

  function encerrarPartida() {
    if (!partida.ativa) return;

    partida.ativa = false;
    limparTemporizadores();
    removerAlvo();
    exibirResultado();
  }

  elementos.botaoIniciar.addEventListener('click', iniciarPartida);

  window.addEventListener('resize', () => {
    if (partida.ativa) posicionarAlvo();
  });
})();
