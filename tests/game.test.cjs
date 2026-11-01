const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const codigo = readFileSync(join(__dirname, '..', 'game.js'), 'utf8');

function prepararJogo() {
  let agora = 0;
  let proximoIdentificador = 0;
  const tarefas = new Map();
  const eventosJanela = {};
  const documento = { activeElement: null };

  function criarElemento() {
    const classes = new Set();
    const eventos = {};
    let texto = '';
    return {
      children: [],
      style: {},
      hidden: false,
      clientWidth: 700,
      clientHeight: 374,
      offsetWidth: 56,
      offsetHeight: 56,
      get textContent() {
        return texto;
      },
      set textContent(valor) {
        texto = String(valor);
      },
      classList: {
        add: (nome) => classes.add(nome),
        remove: (nome) => classes.delete(nome),
        contains: (nome) => classes.has(nome),
        toggle(nome, ativo) {
          if (ativo) classes.add(nome);
          else classes.delete(nome);
        },
      },
      setAttribute(nome, valor) {
        this[nome] = valor;
      },
      addEventListener(nome, funcao) {
        eventos[nome] = funcao;
      },
      append(elemento) {
        this.children.push(elemento);
        elemento.parentElement = this;
      },
      remove() {
        if (this.parentElement) {
          const irmaos = this.parentElement.children;
          irmaos.splice(irmaos.indexOf(this), 1);
          this.parentElement = null;
        }
      },
      focus() {
        documento.activeElement = this;
      },
      clicar(detalhe = 1) {
        eventos.click?.({ currentTarget: this, detail: detalhe });
      },
    };
  }

  const seletores = [
    '#area-jogo',
    '.painel-jogo',
    '#tela-mensagem',
    '#botao-iniciar',
    '#texto-botao',
    '#pontuacao',
    '#acertos',
    '#tempo',
    '#relogio',
    '#barra-tempo',
    '#texto-estado',
    '#anuncio',
    '#etiqueta-tela',
    '#titulo-mensagem',
    '#descricao-mensagem',
    '#dica-inicio',
  ];
  const elementos = Object.fromEntries(seletores.map((seletor) => [seletor, criarElemento()]));
  documento.querySelector = (seletor) => elementos[seletor];
  documento.createElement = criarElemento;

  function agendar(funcao, atraso, repeticao = false) {
    const identificador = ++proximoIdentificador;
    tarefas.set(identificador, { funcao, prazo: agora + atraso, atraso, repeticao });

    return identificador;
  }

  function avancarTempo(duracao) {
    const destino = agora + duracao;

    while (true) {
      const proxima = [...tarefas.entries()]
        .filter(([, tarefa]) => tarefa.prazo <= destino)
        .sort((primeira, segunda) => primeira[1].prazo - segunda[1].prazo)[0];
      if (!proxima) break;

      const [identificador, tarefa] = proxima;
      agora = tarefa.prazo;

      if (tarefa.repeticao) {
        tarefa.prazo += tarefa.atraso;
      } else {
        tarefas.delete(identificador);
      }

      tarefa.funcao();
    }

    agora = destino;
  }

  runInNewContext(codigo, {
    document: documento,
    window: {
      addEventListener(nome, funcao) {
        eventosJanela[nome] = funcao;
      },
    },
    performance: { now: () => agora },
    setTimeout: (funcao, atraso) => agendar(funcao, atraso),
    setInterval: (funcao, atraso) => agendar(funcao, atraso, true),
    clearTimeout: (identificador) => tarefas.delete(identificador),
    clearInterval: (identificador) => tarefas.delete(identificador),
  });

  return {
    elementos,
    documento,
    tarefas,
    avancarTempo,
    iniciar: (detalhe) => elementos['#botao-iniciar'].clicar(detalhe),
    alvo: () => elementos['#area-jogo'].children[0],
    atrasarExecucao(duracao) {
      agora += duracao;
    },
    redimensionar: () => eventosJanela.resize(),
  };
}

test('inicia com 20 segundos, placar zerado e apenas um alvo', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  assert.equal(jogo.elementos['#tempo'].textContent, '20');
  assert.equal(jogo.elementos['#pontuacao'].textContent, '0');
  assert.equal(jogo.elementos['#acertos'].textContent, '0');
  assert.equal(jogo.elementos['#tela-mensagem'].hidden, true);
  assert.equal(jogo.elementos['#texto-estado'].textContent, 'Partida em andamento');
  assert.equal(jogo.elementos['#area-jogo'].children.length, 1);
  jogo.iniciar();
  assert.equal(jogo.tarefas.size, 3, 'iniciar novamente não duplica temporizadores');
});

test('cada acerto soma 10 pontos e substitui o alvo', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  const primeiroAlvo = jogo.alvo();
  primeiroAlvo.clicar();
  assert.notEqual(jogo.alvo(), primeiroAlvo);
  assert.equal(jogo.elementos['#pontuacao'].textContent, '10');
  assert.equal(jogo.elementos['#acertos'].textContent, '1');
  primeiroAlvo.clicar();
  assert.equal(jogo.elementos['#pontuacao'].textContent, '10', 'alvos removidos não pontuam');
  jogo.alvo().clicar();
  assert.equal(jogo.elementos['#pontuacao'].textContent, '20');
  assert.equal(jogo.elementos['#area-jogo'].children.length, 1);
});

test('troca o alvo sem pontuar após 1,2 segundo', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  const primeiroAlvo = jogo.alvo();
  jogo.avancarTempo(1199);
  assert.equal(jogo.alvo(), primeiroAlvo);
  jogo.avancarTempo(1);
  assert.notEqual(jogo.alvo(), primeiroAlvo);
  assert.equal(jogo.elementos['#pontuacao'].textContent, '0');
});

test('o acerto reinicia o prazo de troca do próximo alvo', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  jogo.avancarTempo(1000);
  jogo.alvo().clicar();
  const segundoAlvo = jogo.alvo();
  jogo.avancarTempo(1199);
  assert.equal(jogo.alvo(), segundoAlvo);
  jogo.avancarTempo(1);
  assert.notEqual(jogo.alvo(), segundoAlvo);
});

test('encerra em 20 segundos e cancela todos os temporizadores', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  jogo.alvo().clicar();
  jogo.avancarTempo(19000);
  assert.equal(jogo.elementos['#tempo'].textContent, '1');
  jogo.avancarTempo(1000);
  assert.equal(jogo.elementos['#tempo'].textContent, '0');
  assert.equal(jogo.alvo(), undefined);
  assert.equal(jogo.elementos['#titulo-mensagem'].textContent, '10 pontos!');
  assert.equal(
    jogo.elementos['#descricao-mensagem'].textContent,
    'Você acertou 1 alvo em 20 segundos. Vamos tentar de novo?',
  );
  assert.equal(jogo.elementos['#texto-botao'].textContent, 'Jogar novamente');
  assert.equal(jogo.elementos['#texto-estado'].textContent, 'Partida encerrada');
  assert.equal(jogo.elementos['#tela-mensagem'].hidden, false);
  assert.equal(jogo.tarefas.size, 0);
  jogo.avancarTempo(30000);
  assert.equal(jogo.elementos['#pontuacao'].textContent, '10');
});

test('rejeita acerto depois do prazo mesmo com execução dos temporizadores atrasada', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  jogo.atrasarExecucao(20001);
  jogo.alvo().clicar();
  assert.equal(jogo.elementos['#pontuacao'].textContent, '0');
  assert.equal(jogo.alvo(), undefined);
  assert.equal(jogo.tarefas.size, 0);
});

test('rejeita um clique exatamente no instante em que o tempo acaba', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  jogo.atrasarExecucao(20000);
  jogo.alvo().clicar();

  assert.equal(jogo.elementos['#pontuacao'].textContent, '0');
  assert.equal(jogo.alvo(), undefined);
  assert.equal(jogo.tarefas.size, 0);
});

test('reinicia a partida com pontuação e tempo restaurados', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  jogo.alvo().clicar();
  jogo.avancarTempo(20000);
  jogo.iniciar();
  assert.equal(jogo.elementos['#pontuacao'].textContent, '0');
  assert.equal(jogo.elementos['#acertos'].textContent, '0');
  assert.equal(jogo.elementos['#tempo'].textContent, '20');
  assert.equal(jogo.elementos['#relogio'].classList.contains('tempo-urgente'), false);
  assert.equal(jogo.tarefas.size, 3);
  jogo.avancarTempo(1000);
  assert.equal(jogo.elementos['#tempo'].textContent, '19');
});

test('mantém os alvos dentro da área, inclusive após redimensionar', () => {
  const jogo = prepararJogo();
  jogo.iniciar();
  const area = jogo.elementos['#area-jogo'];
  for (let rodada = 0; rodada < 100; rodada += 1) {
    const alvo = jogo.alvo();
    const esquerda = parseFloat(alvo.style.left);
    const topo = parseFloat(alvo.style.top);
    assert.ok(esquerda >= 0 && esquerda + 56 <= area.clientWidth);
    assert.ok(topo >= 0 && topo + 56 <= area.clientHeight);
    alvo.clicar();
  }
  area.clientWidth = 280;
  area.clientHeight = 300;
  jogo.redimensionar();
  assert.ok(parseFloat(jogo.alvo().style.left) + 56 <= 280);
  assert.ok(parseFloat(jogo.alvo().style.top) + 56 <= 300);
});

test('preserva o foco para jogar pelo teclado e devolve ao botão no fim', () => {
  const jogo = prepararJogo();
  jogo.iniciar(0);
  assert.equal(jogo.documento.activeElement, jogo.alvo());
  jogo.alvo().clicar(0);
  assert.equal(jogo.documento.activeElement, jogo.alvo());
  jogo.avancarTempo(1200);
  assert.equal(jogo.documento.activeElement, jogo.alvo());
  jogo.avancarTempo(18800);
  assert.equal(jogo.documento.activeElement, jogo.elementos['#botao-iniciar']);
});

test('permite várias partidas sem acumular alvos ou temporizadores', () => {
  const jogo = prepararJogo();

  for (let rodada = 0; rodada < 5; rodada += 1) {
    jogo.iniciar();
    assert.equal(jogo.elementos['#pontuacao'].textContent, '0');
    assert.equal(jogo.tarefas.size, 3);

    jogo.alvo().clicar();
    jogo.alvo().clicar();
    jogo.avancarTempo(20000);

    assert.equal(jogo.elementos['#titulo-mensagem'].textContent, '20 pontos!');
    assert.equal(
      jogo.elementos['#descricao-mensagem'].textContent,
      'Você acertou 2 alvos em 20 segundos. Vamos tentar de novo?',
    );
    assert.equal(jogo.elementos['#area-jogo'].children.length, 0);
    assert.equal(jogo.tarefas.size, 0);
  }
});

test('todos os seletores usados pelo jogo possuem um elemento no HTML', () => {
  const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
  const identificadores = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(([, valor]) => valor));
  const classes = new Set(
    [...html.matchAll(/\bclass="([^"]+)"/g)].flatMap(([, valor]) => valor.split(/\s+/)),
  );

  for (const [, seletor] of codigo.matchAll(/document\.querySelector\('([^']+)'\)/g)) {
    const atributos = seletor.startsWith('#') ? identificadores : classes;
    assert.ok(atributos.has(seletor.slice(1)), `Elemento ausente no HTML: ${seletor}`);
  }
});
