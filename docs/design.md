# Design do Elo

A referência visual completa está no canvas do projeto. Este arquivo resume o padrão que o código segue.

## A regra

**Caixa nunca guarda informação. Caixa só marca onde tocar agora.** No máximo um bloco com fundo por tela: as respostas, ou o campo de busca. Informação é texto direto no fundo, separado por espaço e por uma linha fina. Sem sombra, gradiente, selo ou pílula.

## Marca

Dois elos de corrente: uma rua ligada à outra. O dourado é a rua que ainda não respondeu, o mesmo sentido que essa cor tem no app. O nome é **Elo.**, com ponto final.

- Topo das abas: 22 de altura, com o nome ao lado. Tela interna e folha não levam a marca.
- Menor tamanho: 14.
- Código em `src/components/Logo.tsx`. O ícone e a abertura saem de `ferramentas/gerar-marca.swift`.

## Cores

Definidas em `src/theme/cores.ts`, com teste de contraste de 4,5:1. O Tailwind lê as mesmas cores por variáveis aplicadas na raiz do app.

| Token | Escuro | Claro | Uso |
| --- | --- | --- | --- |
| `fundo` | `#0E0E0E` | `#F6F6F3` | Fundo da tela |
| `tinta` | `#F8F8F8` | `#141414` | Texto principal e ícones |
| `apoio` | `#B4B4B4` | `#5B5B56` | Frase de apoio |
| `rotulo` | `#909090` | `#5B5B56` | Rótulos e notas |
| `bloco` | `#1D1D1D` | `#FFFFFF` | O único bloco da tela |
| `folha` | `#1A1A1A` | `#FFFFFF` | Folha que sobe de baixo |
| `silencio` | `#FFE657` | `#7A5200` | Só a rua em silêncio |
| `solido` | `#F8F8F8` | `#141414` | Botão principal |

## Texto

Space Grotesk nos títulos e rótulos, Manrope no resto.

| Tamanho | Uso |
| --- | --- |
| 44 | Resultado: "Recebido.", "4 de 6" |
| 30 | Título da tela |
| 20 | Respostas, nome da marca e título de folha |
| 16 | Texto corrido |
| 12 | Só rótulo curto em maiúsculas e aba |

## Medidas

Margem 24, um eixo só. 32 entre seções, 12 entre rótulo e conteúdo. Toque mínimo 48, linha 56, botão 60, resposta 76. Movimento: 90, 180 e 280 ms.

## Módulos

Toda tela é uma pilha deles, em `src/components`.

| Módulo | O que é |
| --- | --- |
| `Tela`, `Rodape` | Fundo, área segura, rolagem e ação presa embaixo |
| `Topo`, `Voltar` | Marca, nome, rótulo e atalho de emergência; ou só a volta, em tela interna |
| `Titulo`, `Secao` | Título com frase de apoio; rótulo curto de seção |
| `Dados`, `Dado` | Rótulo à esquerda, valor à direita, sem caixa |
| `Linha` | Item de lista com 56 de altura e linha fina |
| `Respostas` | O bloco das três respostas |
| `Botao` | `cheio` (no máximo um por tela) e `texto` |
| `Estado`, `Nota`, `DadoSalvo` | Carregando, erro e vazio; frases discretas |
| `Campo` | Campo de texto, com lupa, ajuda e erro |
| `Folha`, `LinhasEmergencia` | Conteúdo de folha e os telefones 199 e 193 |

`src/components/ui` é a base copiada do React Native Reusables (botão, texto, campo e linha), adaptada para esta escala.
