# Registro do uso de IA (prompts.md)

Transparência: **o esqueleto deste app foi gerado com IA** (Claude Code, da Anthropic), a partir do pedido do João para montar o app ligado às APIs que a equipe escolheu (INMET, Open-Meteo, BrasilAPI, ViaCEP e IBGE), com SQLite, telas em Expo Router e acessibilidade. O que a IA gerou:

- a estrutura de pastas, o tema, os componentes e as telas;
- a camada de serviços, o banco local e os testes automáticos;
- o contrato proposto para a API do bairro (`docs/contrato-api.md`) e este README;
- o redesenho de todas as telas, o tema, a logo, o ícone e a escolha das bibliotecas de UI (`docs/design.md`).

A IA decidiu sozinha alguns detalhes que a equipe precisa conferir: os caminhos da API do bairro, os intervalos de envio do ESP32 (30 s e 10 s), as ruas e os planos de exemplo, e a janela de 15 minutos do indicador.

**Todos os integrantes precisam saber explicar o código** que está no repositório, na entrevista e na apresentação. Quem não entender uma parte deve pedir explicação à equipe ou estudar o arquivo antes de entregar.

## O que a equipe precisa fazer

- [ ] Rodar o app e conferir cada tela, em vez de confiar só nos testes.
- [ ] Ler `src/services`, `src/db` e `app/` até conseguir explicar o caminho de uma chamada (tela, banco, envio).
- [ ] Validar o contrato da API com os colegas de C#.
- [ ] Preencher nomes, RM e o link do vídeo no README.

## Registro da equipe

Anotem aqui cada uso de IA durante o projeto. Uma linha por uso.

| Data | Quem | Ferramenta | O que foi pedido | O que usamos | O que mudamos ou corrigimos |
| --- | --- | --- | --- | --- | --- |
| 05/11/2026 | João | Claude Code | Montar o app ligado às APIs escolhidas (esqueleto, telas, banco, serviços e documentação) | Estrutura inteira do app | A conferir |
| 05/11/2026 | João | Claude Code | Repensar o UX e o UI de todas as telas em um canvas, com referência nos apps do João, e aplicar no app | Tema, módulos, telas, regras novas (resposta em um toque, reenvio automático, "Vou até lá", treino) e testes | Pediu três refações do visual até o padrão minimalista, escolheu a logo de duas argolas e o nome curto Elo. Falta a equipe conferir |
| 05/11/2026 | João | Claude Code | Montar um PDF explicando a ideia inteira para o grupo decidir se aceita | Texto, layout e calendário sugerido do PDF da proposta, a partir da pesquisa e das regras da GS | A conferir pelo João antes de enviar |
| 10/11/2026 | João | Claude Code | Fazer a issue #1: aviso no app quando a régua passa do limite | Regra do aviso e testes, atualização periódica da régua, aviso na aba Agora e ajuste do README | A conferir |
| 14/11/2026 | João | Claude Code | Atualizar o app para receber os dados do painel e da API em C# | Tipos e leitura dos campos novos de `/situacao` e `/regua` (bairro, "sem o app", coordenadas, nível de atenção), linha "Sem o app" na aba Bairro, botão "Ver no mapa" na rua, "em atenção" na régua, avisos pela API do bairro (`GET /avisos`), mocks do piloto, testes e documentação | A conferir: o app ainda não foi rodado contra a API de verdade, só com respostas simuladas nos testes |
| 14/11/2026 | João | Claude Code | Corrigir os defeitos da revisão do PR #5 (aviso da régua) | Aviso no topo da aba Agora em todos os estados, regra única de anúncio e vibração (só leitura nova, no máximo a cada 5 minutos), tolerância ao relógio do celular, `valorDaRegua` único para Agora e Bairro, atualização periódica sem empilhar buscas, acessibilidade do aviso, testes e documentação | A conferir |
|  |  |  |  |  |  |
