# Seleção — regras de produto e arquitetura futura

> **Documento conceitual (DEV-DIAGNOSTIC-0.5, 03/10/2026).** A Seleção **NÃO está implementada**. Não há convites,
> convocações, jogos internacionais nem efeito no desenvolvimento. Este documento só registra as decisões oficiais do
> produto e como a arquitetura atual poderia suportá-las **sem alterar o Engine 0.2.0**.

## Decisões oficiais do produto

### Quem pode treinar a Seleção principal

- **Só um treinador de clube da 1ª divisão.**
- Um treinador da D2, D3 ou D4 pode ter uma carreira excelente, ganhar títulos e receber propostas de clubes maiores,
  mas não comanda a Seleção enquanto não estiver na D1.
- Progressão conceitual: D4 → D3 → D2 → D1 → grandes clubes e grandes conquistas → convite para a Seleção.

### Convite

O convite é consequência da carreira, não sorteio e não "ganhou título". Fatores conceituais:

- divisão atual;
- posição na tabela;
- títulos, acessos e campanhas;
- desempenho e consistência;
- tamanho e expectativa do clube;
- histórico do treinador;
- reputação acumulada.

Levar um clube pequeno da D4 até a D1 pode construir uma reputação extraordinária. A narrativa esperada é:

bom trabalho → destaque → monitoramento → interesse → convite.

### Convocação

- **Só jogadores da nacionalidade da Seleção.** Jogador de nacionalidade incompatível não pode ser convocado.
- Lesionados e suspensos aparecem como indisponíveis quando aplicável.
- A convocação **não é só força**. Pode considerar:
  - força e idade;
  - forma e momento;
  - titularidade no clube;
  - jogos, gols e assistências;
  - desempenho;
  - lesões e suspensão.
- O treinador escolhe livremente entre os elegíveis. Exemplo: entre um jogador de força 45, reserva e em má fase, e um
  de força 41, titular e em grande temporada, o treinador pode escolher o de 41.

### Seleção e desenvolvimento

- **Convocar ≠ dar força.** "Convocado = +1" é proibido. Isso está coberto por teste em
  `game/tests/strength-invariants.test.ts`: dados de convocação no contexto não alteram strengthCurrent.
- A participação internacional pode, no futuro, alimentar **contexto e desempenho**, como evidência de partidas
  disputadas e ambiente de elite. Não substitui o desempenho no clube.
- A Seleção é um **acelerador de elite**, não um requisito. Um jogador pode chegar a 50 só com uma carreira
  extraordinária no clube. Clube + desempenho + títulos + Seleção é um dos caminhos mais fortes.

## Estado atual do código

- `Player.nationality` existe e é texto livre: `'Brasil'`, `'Argentina'`, … no mundo fictício; `nationality` no universo
  real. Não é um código ISO (BR, AR).
  - No mundo fictício (seed `elite-dev-world-10`), 1.719 de 1.920 jogadores são brasileiros. Os outros são da Argentina,
    do Uruguai, do Paraguai e da Colômbia.
- Não existe nenhum módulo de Seleção, convite ou convocação. O único filtro por nacionalidade é a busca do mercado
  (`game/manager/market.ts`).
- O desenvolvimento experimental (`game/development/`) lê só evidência de partida (minutos, gols, defesas, placar,
  cartão, lesão), idade, posição, ambiente do clube e nível da divisão. **Não lê títulos nem Seleção.**

## Arquitetura futura (sem alterar o Engine 0.2.0)

```
Player
├── club performance          ← já existe: MatchEvidence por partida (evidence.ts), estatísticas da temporada
├── club trophies             ← derivável: PromotionResult.champions por temporada (hoje não acumulado por jogador)
├── national team performance ← NOVA camada: evidência das partidas da Seleção (o engine joga a partida como hoje)
├── national team appearances ← NOVA camada: histórico de convocações e jogos
└── development context       ← development.ts: hoje clube + divisão; amanhã + contexto de elite (opcional)
```

1. **Partidas da Seleção:** o Engine 0.2.0 já joga qualquer `Fixture` (dois `MatchTeamInput`). Uma Seleção é um "clube"
   montado em memória com os convocados. **Nenhuma mudança no engine.**
2. **Calendário:** as datas FIFA teriam de ser uma camada nova, fora do calendário de clubes. O calendário de clubes atual
   não muda; é uma decisão de produto ainda aberta.
3. **Carreira do treinador:** a reputação, o histórico e o convite seriam uma camada nova em `game/manager/`, com estado
   no save (o `ManagerState` já guarda histórico, notícias e finanças). A regra da D1 seria uma checagem da divisão do
   clube atual.
4. **Desenvolvimento:** a evidência internacional poderia entrar como rodadas extras de `MatchEvidence`, com o ambiente da
   Seleção (os 16 melhores da nacionalidade). O DEV-DIAGNOSTIC-0.5 mediu isso como sonda.
   - Com a DEV-PROTO-0.4-B, o efeito é **no máximo +1** em 10 anos e **zero** para quem já está no limite contextual.
   - Motivo: o +1 é decidido no fim da janela do clube, com o limite do clube.
   - Para a Seleção funcionar como acelerador de elite, o limite contextual precisaria considerar o contexto de elite.
     Isso é calibração da DEV-PROTO-0.5, não desta etapa.
5. **Títulos:** para entrarem no desenvolvimento, precisam virar dado por jogador (campeão com X minutos na temporada).
   Hoje só existe o campeão por divisão.

**Conclusão:** a arquitetura suporta a Seleção sem tocar no Engine 0.2.0. Precisa de camadas novas de jogo
(convite/convocação/calendário internacional) e, se a Seleção for influenciar o desenvolvimento, de uma entrada nova
de contexto de elite no PlayerDevelopment. **Nada disso foi implementado.**
