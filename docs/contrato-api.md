# Contrato da API do Elo

Para os colegas de C# (API), SOA (integração) e Physical Computing (ESP32).
O app já funciona sem a API, com dados de exemplo (`src/mocks`). Quando `EXPO_PUBLIC_API_URL` é definido
(e `EXPO_PUBLIC_USE_MOCK` não é `true`), o app passa a chamar os endpoints abaixo.
Quem consome no app: `src/services/bairro.ts`.

## Regras gerais

- JSON em UTF-8. Datas em ISO 8601 com fuso (`2026-11-05T14:42:00Z`); o app converte para o horário do aparelho.
- **Sem dado pessoal.** Nada de nome, telefone ou endereço de morador. A "rua" é só um id e um nome público (ex.: "Rua 3").
- `status` da rua: `tudo_bem`, `agua_subindo`, `preciso_ajuda`. **Silêncio** é `status: null`.
- Erros: código HTTP correto (4xx/5xx). O app trata qualquer status fora de 2xx como falha e mostra o último dado guardado.
- O app não faz login. O acesso do piloto vai por URL própria do bairro (chave de dispositivo para o ESP32, abaixo).
- Janela da chamada: 15 minutos (`config.janelaMinutos`). Indicador de impacto: percentual de ruas com situação conhecida
  até 15 minutos depois do início da chamada.

## O que o app lê

### `GET /situacao`

Situação do bairro na chamada atual. Já ordenada ou não: o app ordena (silêncio primeiro, mais antigo no topo).
O LINQ do servidor pode ordenar também, para quem consumir sem o app.

```json
{
  "bairro": "Bairro de exemplo",
  "chamadaIniciadaEm": "2026-11-05T14:42:00Z",
  "ruas": [
    { "id": "travessa-7", "nome": "Travessa 7", "status": null, "respondidaEm": null },
    { "id": "rua-alta", "nome": "Rua Alta", "status": "preciso_ajuda", "respondidaEm": "2026-11-05T14:52:00Z" }
  ]
}
```

- `chamadaIniciadaEm`: `null` se não há chamada em andamento.
- `respondidaEm`: `null` quando `status` é `null`. Resposta de chamada anterior não vale: a rua volta a `null`. É o `criadaEm` recebido no `POST /chamadas`, não a hora do servidor: o app compara os dois para saber se a resposta na tela é a dele.

### `POST /chamadas`

O app envia cada chamada feita pela liderança da rua. Se estiver sem internet, guarda no aparelho
e reenvia depois. Por isso o **`id` é criado no app** e o servidor deve ser idempotente: o mesmo `id` enviado duas vezes
vira um só registro.

```json
{
  "id": "m3k9x2a-7f4q1b2c",
  "ruaId": "rua-3",
  "status": "agua_subindo",
  "pessoas": 2,
  "observacao": "Água na calçada",
  "criadaEm": "2026-11-05T15:00:00.000Z"
}
```

- `pessoas` e `observacao` podem ser `null`. `observacao` é texto livre curto (o app limita a 200 caracteres; o servidor deve recusar
  mais que isso) e **pode conter dado pessoal digitado sem querer**: não registrar em log.
- Resposta: `201` (ou `200` se já existia), corpo opcional.

### `GET /regua`

Última leitura da régua de nível, enviada pelo ESP32 (ver abaixo).

```json
{
  "reguaId": "regua-exemplo",
  "local": "Córrego do bairro de exemplo",
  "nivelMetros": 1.42,
  "limiteMetros": 1.2,
  "medidaEm": "2026-11-05T14:58:00Z"
}
```

O app mostra "acima do limite" quando `nivelMetros >= limiteMetros`. Com a tela aberta, ele busca a régua a cada 30 s, e a cada 10 s acima do limite. Leitura com mais de 5 minutos aparece com a hora da medida, como leitura antiga.

### `GET /ruas/{id}/plano`

Plano da rua (ponto de encontro, rota de saída). `404` quando a rua não tem plano: o app mostra o estado vazio.

```json
{
  "ruaId": "travessa-7",
  "ruaNome": "Travessa 7",
  "pontoEncontro": "Praça de exemplo, no alto da Rua Alta",
  "rotaSaida": "Suba pela Rua Alta e evite o Beco do Rio.",
  "abrigo": "Escola de exemplo (ponto de apoio fictício)",
  "itensParaLevar": ["Documentos em saco plástico", "Remédios de uso diário"],
  "contatos": [{ "nome": "Defesa Civil", "telefone": "199" }, { "nome": "Bombeiros", "telefone": "193" }]
}
```

## O que o ESP32 envia

### `POST /leituras`

A cada 30 s em condição normal e a cada 10 s com nível acima do limite. Mesmo corpo, enviado com a chave do dispositivo.

```http
POST /leituras
Content-Type: application/json
X-Chave-Dispositivo: <chave do equipamento, guardada no firmware, nunca no repositório>

{ "reguaId": "regua-exemplo", "nivelMetros": 1.42, "medidaEm": "2026-11-05T14:58:00Z", "bateriaPercentual": 87 }
```

- `nivelMetros`: altura da água em metros, com 2 casas (sensor ultrassônico: `nivel = alturaDoSensor - distanciaMedida`).
- `medidaEm`: UTC. Se o ESP32 não tiver relógio confiável, omitir; o servidor usa a hora de recebimento.
- `bateriaPercentual`: opcional.
- O limite (`limiteMetros`) fica no servidor, por régua, e não no firmware. O buzzer local usa o limite gravado no ESP32.
- Resposta: `204`. O servidor guarda a última leitura por `reguaId` para o `GET /regua`.

## APIs públicas que o app usa direto (sem passar pela API própria)

| Serviço | Para quê | Observação |
| --- | --- | --- |
| INMET `GET https://apiprevmet3.inmet.gov.br/avisos/ativos` | Avisos meteorológicos ativos | Veja abaixo |
| Open-Meteo `GET https://api.open-meteo.com/v1/forecast` | Chuva das próximas 3 horas | Grátis, sem chave |
| BrasilAPI `GET /api/cep/v2/{cep}` e ViaCEP `GET /ws/{cep}/json/` | CEP para área e código IBGE | ViaCEP é reserva |
| IBGE `GET /api/v1/localidades/municipios/{codigo}/distritos` | Distritos do município | Grátis, sem chave |

### Recomendação para a API própria: filtrar o INMET

A resposta de `avisos/ativos` tem **cerca de 580 KB** para o Brasil inteiro (polígonos, ícones em base64, lista de todos os
municípios de cada aviso). Em celular com rede ruim isso demora e gasta o pacote de dados do morador.
O app só precisa de poucos campos para a área dele. A API própria deveria baixar o INMET a cada poucos minutos,
filtrar pelo código IBGE e devolver só o necessário (algumas centenas de bytes):

```
GET /avisos?codigoIbge=3550308
[
  {
    "id": "56273", "titulo": "Tempestade", "severidade": "Perigo",
    "inicio": "2026-11-05T00:01:00-03:00", "fim": "2026-11-05T23:59:00-03:00",
    "riscos": ["Chuva entre 30 e 60 mm/h ..."], "instrucoes": ["Evite usar aparelhos eletrônicos ligados à tomada."]
  }
]
```

`riscos` e `instrucoes` como **listas de verdade**, como veio no JSON real conferido em 05/11/2026. O INMET não publica
um contrato, então o app também aceita a lista escrita como texto do Python (`"['a', 'b']"`), em
`src/services/listaPython.ts`. A troca não exige mudança no app além de apontar a URL.

Pontos do formato do INMET que o filtro deve respeitar: `geocodes` é uma string de códigos IBGE separados por vírgula
(comparar o código inteiro, nunca por prefixo); `encerrado` indica aviso já encerrado (descartar); `inicio` e `fim` vêm como
`"2026-11-05 00:01"` em horário de Brasília, sem fuso.
