# Marca Confere Multa

## Ideia
- **Ícone:** placa de atenção (losango amarelo) com um visto, ou seja, "multa conferida".
- **Tom:** direto, honesto e sem promessa de resultado.
- **Proibido:** brasões, gov.br, cores ou layout do Detran, ou qualquer coisa que pareça órgão público. A marca é de **serviço privado**.

## Arquivos
| Arquivo | Uso |
|---|---|
| `logo.svg` / `logo.png` | Logo horizontal sobre fundo claro |
| `logo-negativo.svg` / `logo-negativo.png` | Logo sobre fundo preto |
| `icone.svg`, `icone-512.png` | Foto de perfil (TikTok, Kiwify), ícone de app |
| `icone-180.png` | Ícone de atalho no celular (Apple touch icon) |
| `icone-32.png` | Favicon (já embutido nas páginas, em SVG) |
| `brand-board.png` | Resumo visual da marca |

## Paleta
| Cor | Hex | Uso |
|---|---|---|
| Amarelo placa | `#FFD31A` | Cor principal: topo, destaques, ícone |
| Preto asfalto | `#111111` | Texto e botões |
| Creme | `#FFFBEA` | Fundo das páginas |
| Verde | `#0F7B4F` | "Falha encontrada" (boa notícia) |
| Vermelho | `#B42318` | Prazo vencido e alertas |

Contraste: preto sobre amarelo ≈ 13:1 e amarelo sobre preto ≈ 13:1. Os dois passam com folga no WCAG AA.

## Tipografia
- Sans-serif do sistema, para carregar rápido sem fontes externas.
- Títulos com peso 800 e espaçamento levemente negativo.
- Texto com peso 400.
- "MULTA" em caixa alta com espaçamento largo.

## Interface (regras da página)
1. **Uma ação por tela.** O botão principal é sempre preto com texto amarelo.
2. **Verde** só para notícia boa e **vermelho** só para prazo e risco. O amarelo nunca indica erro.
3. Rodapé sempre com "serviço privado, não é o Detran" e "não é assessoria jurídica".
4. Pensada para celular primeiro: largura de 390 px, toques grandes (≥ 44 px), sem rolagem lateral.
