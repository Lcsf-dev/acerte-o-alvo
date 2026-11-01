# 🎯 Acerte o Alvo

Minigame do **Desafio 05**, desenvolvido com HTML, CSS e JavaScript puros para praticar eventos, posicionamento aleatório, animações, temporizadores e manipulação do DOM.

## 🎮 Como jogar

Abra o arquivo `index.html` em um navegador e clique em **Iniciar partida**. Não é necessário instalar dependências ou executar um servidor.

- ⏱️ A partida dura **20 segundos**.
- 🎯 Cada alvo tem **56 px** de diâmetro e vale **10 pontos**.
- 📍 Ao acertar, o alvo é substituído por outro em uma posição aleatória.
- 🔄 Sem acerto, o alvo muda após **1,2 segundo**. Esse prazo reinicia para cada alvo.
- 🏆 Ao terminar, o jogo mostra a pontuação final e permite jogar novamente.

Também é possível jogar usando **Tab**, **Enter** e **Espaço**. O jogo respeita a preferência de redução de movimento do sistema.

## 📁 Organização

- `index.html`: estrutura semântica, placar, área de jogo e instruções.
- `style.css`: aparência, animação dos alvos e adaptação para celulares.
- `game.js`: criação dos alvos, pontuação, controle do tempo e reinício.
- `tests/game.test.cjs`: testes da lógica com relógio e DOM simulados.

No JavaScript, as configurações, o estado da partida e os temporizadores ficam agrupados separadamente. As funções de interface cuidam da apresentação, enquanto as funções de controle gerenciam os alvos e o ciclo da partida. O código fica em um escopo próprio para evitar variáveis globais, e a pontuação é calculada a partir dos acertos.

O cronômetro usa `performance.now()` para calcular o tempo restante a partir de um prazo fixo, evitando acumular atrasos dos temporizadores. Os temporizadores são cancelados no encerramento, e cliques após o prazo não pontuam.

## 🧪 Testes

Com o Node.js 18 ou mais recente instalado, execute na pasta do projeto:

```sh
node --test tests/game.test.cjs
```

Os testes verificam a lógica sem dependências externas. A inspeção visual e a interação real no navegador são verificações complementares.

Os níveis de dificuldade, efeitos sonoros e recordes ficam como possibilidades de expansão; as regras atuais seguem o desafio original.
