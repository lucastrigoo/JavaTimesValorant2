# VCT HUB // Sistema de Cadastro e Gestão de Times (Valorant eSports)

Este projeto consiste em uma aplicação Full-Stack completa para gestão e cadastro de organizações e equipes do cenário competitivo de **VALORANT (VCT)**.

O backend foi construído em **Java com Spring Boot 4 / Jakarta EE / Spring Data JPA / PostgreSQL**, e o frontend foi desenvolvido utilizando **HTML5 semântico, CSS3 moderno (Dark Mode temático de Valorant) e JavaScript puro (Vanilla JS / ES6+) com a API Fetch nativa**.

---

## 1. Regras e Princípios de Arquitetura

1. **Backend Intacto (Regra de Ouro):** Nenhuma classe Java, endpoint, anotação ou regra de negócio foi alterada. O código do backend permanece estritamente original.
2. **Frontend Leve e Educacional:** Solução desenvolvida sem frameworks complexos (sem React, Vue ou Angular) para garantir máxima clareza pedagógica durante a explicação ao professor avaliador.
3. **Comentários Estruturados no Código:** Cada função JavaScript contém cabeçalhos detalhados explicando o que ela faz, como constrói requisições HTTP (headers, verbos, corpo), como lida com assincronismo (`async/await`) e como manipula o DOM.
4. **Sem Problemas de CORS:** Os arquivos da interface foram alocados em `src/main/resources/static/`, de modo que o próprio Spring Boot serve o frontend na mesma origem (`http://localhost:8080/`), eliminando bloqueios de CORS por padrão no navegador.

---

## 2. Análise dos Endpoints do Backend Java (`TimeController.java`)

Abaixo está o mapeamento detalhado da API REST implementada no backend:

| Operação CRUD | Verbo HTTP | Endpoint / URL | Parâmetros / Headers | Corpo da Requisição (Body JSON) | Retorno / Status HTTP |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **CREATE** | `POST` | `/time` | Header: `Content-Type: application/json` | `{"nome": "LOUD", "tier": 1, "starPlayer": "Less", "internacionais": true}` | `200 OK` (Vazio) |
| **READ** | `GET` | `/time?nome={nome}` | Query Param: `@RequestParam String nome` | *Sem corpo* | `200 OK` (Objeto `Time`) |
| **UPDATE** | `PUT` | `/time?id={id}` | Query Param: `@RequestParam Integer id`<br>Header: `Content-Type: application/json` | `{"nome": "LOUD", "tier": 1, "starPlayer": "pANcada", "internacionais": true}` | `200 OK` (Vazio) |
| **DELETE** | `DELETE` | `/time?nome={nome}` | Query Param: `@RequestParam String nome` | *Sem corpo* | `200 OK` (Vazio) |

### Estrutura da Entidade `Time.java`:
- `id` (`Integer`): Chave primária gerada automaticamente pelo banco (`@GeneratedValue(strategy = GenerationType.AUTO)`).
- `nome` (`String`): Nome único do time (chave para busca e exclusão).
- `tier` (`Integer`): Nível competitivo da equipe (1 = VCT Franquias, 2 = Challengers/Ascension, 3 = Premier/Amador).
- `starPlayer` (`String`): Jogador destaque / MVP da equipe (ex: `aspas`, `TenZ`, `Derke`).
- `internacionais` (`Boolean`): Indicador de participação em torneios mundiais (Masters / Champions).

---

## 3. Estrutura de Arquivos do Frontend

Os arquivos estão disponíveis em `src/main/resources/static/` (servidos nativamente pelo Spring Boot) e também na pasta `frontend/`:

```
cadastro-times/
├── frontend/                              # Cópia para visualização avulsa
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/main/resources/
│   ├── application.properties             # Conexão com banco PostgreSQL
│   └── static/                            # Arquivos servidos pelo Spring Boot
│       ├── index.html                     # Estrutura semântica e acessível
│       ├── style.css                      # Tema tático Dark Mode Valorant / VCT
│       └── app.js                         # Lógica Vanilla JS + Fetch API + DOM
└── pom.xml
```

---

## 4. Como Executar a Aplicação

### Passo 1: Iniciar o Banco de Dados PostgreSQL
Certifique-se de que o serviço do PostgreSQL está ativo na porta padrão `5432` com o banco `cadastro_time`:
- **URL:** `jdbc:postgresql://localhost:5432/cadastro_time`
- **Usuário:** `postgres`
- **Senha:** `postgres`

### Passo 2: Executar o Backend Spring Boot
Abra o terminal no diretório do projeto e execute:
```bash
./mvnw spring-boot:run
```
Ou execute a classe `CadastroTimesApplication.java` diretamente pelo IntelliJ IDEA.

### Passo 3: Acessar a Interface Web
Abra o navegador de sua preferência no endereço:
```
http://localhost:8080/
```
Ou diretamente:
```
http://localhost:8080/index.html
```

---

## 5. Roteiro Pedagógico para Apresentação ao Professor

Durante a avaliação, você pode demonstrar os seguintes tópicos:

1. **Apresentar a Consulta (READ - GET):**
   - No campo de busca superior, digite o nome de um time (ex: `LOUD`) e clique em **BUSCAR (GET)**.
   - Mostre no DevTools (F12 > Aba *Network/Rede*) a requisição disparada:
     - `GET http://localhost:8080/time?nome=LOUD`
     - Status retornado: `200 OK` com o JSON contendo os dados recuperados do PostgreSQL.

2. **Apresentar o Cadastro (CREATE - POST):**
   - Utilize um dos botões de preenchimento rápido (ex: clique no botão "Sentinels") ou preencha os campos manualmente.
   - Clique em **CADASTRAR TIME (POST)**.
   - Demonstre na aba *Network*:
     - `POST http://localhost:8080/time`
     - Cabeçalho: `Content-Type: application/json`
     - Payload enviado serializado via `JSON.stringify()`.
     - O time surge imediatamente na tela com seu Card estilizado e métricas atualizadas.

3. **Apresentar a Atualização (UPDATE - PUT):**
   - Em qualquer um dos cards na tela, clique no botão **EDITAR (PUT)**.
   - A interface entrará no **Modo de Operação: Atualização**, preenchendo todos os campos e destacando o ID no banner roxo.
   - Modifique o jogador destaque (ex: de `TenZ` para `bang`) e clique em **SALVAR ALTERAÇÕES (PUT)**.
   - Demonstre a requisição:
     - `PUT http://localhost:8080/time?id=1`
     - Os dados atualizados são gravados no banco e a interface reflete a nova informação.

4. **Apresentar a Exclusão Segura (DELETE):**
   - Clique no botão **EXCLUIR (DELETE)** de um dos cards.
   - Destaque o **Modal Tático de Confirmação** que impede exclusões acidentais.
   - Clique em **CONFIRMAR EXCLUSÃO (DELETE)**.
   - Demonstre a requisição:
     - `DELETE http://localhost:8080/time?nome=Sentinels`
     - Status: `200 OK`. O card é removido do DOM e as métricas são recalculadas em tempo real.

5. **Explicar a Arquitetura dos Comentários no `app.js`:**
   - Abra o arquivo `app.js` e mostre como cada função foi dividida didaticamente em 4 etapas:
     1. Objetivo da função
     2. Construção da requisição HTTP (método, headers, body)
     3. Processamento assíncrono com `async/await` e tratamento de erros
     4. Atualização dos elementos visuais no DOM
