/**
 * ============================================================================
 * VCT HUB // GERENCIADOR DE TIMES VALORANT (JAVASCRIPT VANILLA)
 * ============================================================================
 * Código Frontend Educativo desenvolvido com JavaScript Puro (ES6+) e Fetch API nativa.
 * Integração direta com o backend Java Spring Boot (TimeController.java).
 *
 * ESTRUTURA DOS ENDPOINTS INTEGRADOS:
 * - POST   /time           -> Cadastrar novo time
 * - GET    /time?nome={n}  -> Consultar time por nome
 * - PUT    /time?id={id}   -> Atualizar dados do time existente
 * - DELETE /time?nome={n}  -> Excluir time por nome
 * ============================================================================
 */

// ============================================================================
// CONFIGURAÇÃO DA URL BASE DA API
// ============================================================================
// Se a página for servida pelo próprio Spring Boot (ex: http://localhost:8080/),
// utilizamos o caminho relativo '/time'. Caso seja aberta por Live Server ou file://,
// utilizamos a URL absoluta 'http://localhost:8080/time'.
const API_BASE_URL = window.location.origin.includes(':8080')
  ? '/time'
  : 'http://localhost:8080/time';

// ============================================================================
// ESTADO GLOBAL DA APLICAÇÃO (CLIENT-SIDE STATE)
// ============================================================================
// Mantém os times atualmente carregados em memória e a lista de nomes rastreados
// armazenada no localStorage do navegador para persistência entre recarregamentos.
const appState = {
  times: [],                                            // Lista de objetos Time carregados do backend
  modoVisualizacao: 'cards',                           // 'cards' ou 'tabela'
  timeEmEdicaoId: null,                                 // ID do time selecionado para PUT (null = modo cadastro)
  timeParaExclusaoNome: null,                           // Nome do time pendente de confirmação no modal DELETE
  chaveStorage: 'vct_times_cadastrados_nomes'           // Chave do localStorage para nomes de times conhecidos
};

// ============================================================================
// MAPEAMENTO DOS ELEMENTOS DO DOM (DOCUMENT OBJECT MODEL)
// ============================================================================
const dom = {
  // Formulário e Campos
  teamForm: document.getElementById('teamForm'),
  timeId: document.getElementById('timeId'),
  timeNome: document.getElementById('timeNome'),
  timeTier: document.getElementById('timeTier'),
  timeStarPlayer: document.getElementById('timeStarPlayer'),
  timeInternacionais: document.getElementById('timeInternacionais'),
  btnSubmitForm: document.getElementById('btnSubmitForm'),
  btnSubmitText: document.getElementById('btnSubmitText'),
  btnClearForm: document.getElementById('btnClearForm'),
  formTitle: document.getElementById('formTitle'),
  formModeSubtitle: document.getElementById('formModeSubtitle'),
  editModeIndicator: document.getElementById('editModeIndicator'),
  editTeamNameDisplay: document.getElementById('editTeamNameDisplay'),
  editTeamIdDisplay: document.getElementById('editTeamIdDisplay'),
  btnCancelEdit: document.getElementById('btnCancelEdit'),

  // Busca e Filtros
  inputSearchNome: document.getElementById('inputSearchNome'),
  btnSearchTime: document.getElementById('btnSearchTime'),
  btnSyncAll: document.getElementById('btnSyncAll'),

  // Alternância de Visualização
  btnViewCards: document.getElementById('btnViewCards'),
  btnViewTable: document.getElementById('btnViewTable'),
  cardsGrid: document.getElementById('cardsGrid'),
  tableContainer: document.getElementById('tableContainer'),
  tableBody: document.getElementById('tableBody'),

  // Estados Visuais (Loading, Vazio)
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),

  // Métricas
  metricTotal: document.getElementById('metricTotal'),
  metricTier1: document.getElementById('metricTier1'),
  metricInternacionais: document.getElementById('metricInternacionais'),

  // Modal de Exclusão
  deleteModalBackdrop: document.getElementById('deleteModalBackdrop'),
  modalTeamNameTarget: document.getElementById('modalTeamNameTarget'),
  btnCancelDeleteModal: document.getElementById('btnCancelDeleteModal'),
  btnModalCancelAction: document.getElementById('btnModalCancelAction'),
  btnModalConfirmDelete: document.getElementById('btnModalConfirmDelete'),

  // Guia Educacional & Notificações
  btnToggleGuide: document.getElementById('btnToggleGuide'),
  btnCloseGuide: document.getElementById('btnCloseGuide'),
  eduGuideSection: document.getElementById('eduGuideSection'),
  toastContainer: document.getElementById('toastContainer'),
  apiStatusText: document.getElementById('apiStatusText')
};

// ============================================================================
// 1. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================
/**
 * Função executada automaticamente quando todo o DOM da página HTML é carregado.
 * O QUE FAZ:
 * - Registra os ouvintes de eventos (event listeners) em botões, formulários e inputs.
 * - Sincroniza a lista de times conhecidos com o banco de dados via GET.
 * - Configura os atalhos de preenchimento rápido (demo).
 */
document.addEventListener('DOMContentLoaded', () => {
  configurarEventos();
  carregarTimesIniciais();
});

/**
 * Registra os manipuladores de evento (Event Listeners) para interatividade na UI.
 */
function configurarEventos() {
  // Submissão do Formulário (CREATE via POST ou UPDATE via PUT)
  dom.teamForm.addEventListener('submit', tratarSubmissaoFormulario);

  // Botão Limpar Formulário
  dom.btnClearForm.addEventListener('click', resetarFormulario);

  // Botão Cancelar Modo Edição
  dom.btnCancelEdit.addEventListener('click', cancelarModoEdicao);

  // Busca de Time por Nome (GET /time?nome={nome})
  dom.btnSearchTime.addEventListener('click', tratarBuscaPorNome);
  dom.inputSearchNome.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tratarBuscaPorNome();
    }
  });

  // Botão Sincronizar Todos os Times
  dom.btnSyncAll.addEventListener('click', carregarTimesIniciais);

  // Alternância de Visualização (Cards vs Tabela)
  dom.btnViewCards.addEventListener('click', () => alternarVisualizacao('cards'));
  dom.btnViewTable.addEventListener('click', () => alternarVisualizacao('tabela'));

  // Fechamento e Confirmação do Modal de Exclusão
  dom.btnCancelDeleteModal.addEventListener('click', fecharModalExclusao);
  dom.btnModalCancelAction.addEventListener('click', fecharModalExclusao);
  dom.btnModalConfirmDelete.addEventListener('click', executarExclusaoConfirmada);

  // Toggle do Guia Educacional dos Endpoints
  dom.btnToggleGuide.addEventListener('click', () => {
    dom.eduGuideSection.classList.toggle('active');
  });
  dom.btnCloseGuide.addEventListener('click', () => {
    dom.eduGuideSection.classList.remove('active');
  });

  // Botões de Carregamento Rápido (Demo)
  document.querySelectorAll('.btn-demo-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const demoKey = btn.getAttribute('data-demo');
      preencherFormularioComDemo(demoKey);
    });
  });
}

// ============================================================================
// 2. OPERAÇÃO READ (GET): CONSULTA E SINCRONIZAÇÃO
// ============================================================================

/**
 * ============================================================================
 * FUNÇÃO: buscarTimeNoBackend(nomeTime)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Realiza uma consulta HTTP GET no endpoint do Spring Boot para buscar um
 *    time específico pelo seu nome único no banco de dados.
 *
 * 2. CONSTRUÇÃO DA REQUISIÇÃO HTTP (FETCH API):
 *    - Método HTTP: GET (padrão do fetch quando não especificado, mas declarado explicitamente)
 *    - URL: `${API_BASE_URL}?nome=${encodeURIComponent(nomeTime)}`
 *           Exemplo real: http://localhost:8080/time?nome=LOUD
 *           A função encodeURIComponent() garante a formatação segura de caracteres especiais e espaços.
 *    - Cabeçalhos (Headers):
 *           'Accept': 'application/json' -> Informa ao servidor que o cliente espera receber JSON como resposta.
 *    - Corpo da Requisição (Body):
 *           NÃO HÁ CORPO (o método GET não envia body no protocolo HTTP REST).
 *
 * 3. PROCESSAMENTO DA RESPOSTA (ASYNC / AWAIT / PROMISE):
 *    - 'await fetch(...)': Aguarda a conclusão da promessa de rede e retorna o objeto Response.
 *    - 'if (!response.ok)': Verifica se o código de status HTTP está fora da faixa 200-299.
 *           Se o time não existir, o backend lança uma exceção RuntimeException resultando em HTTP 500/404.
 *    - 'await response.json()': Desserializa o fluxo de bytes JSON recebido em um objeto JavaScript puro.
 *
 * 4. RETORNO:
 *    Retorna o objeto Time contendo: { id, nome, tier, starPlayer, internacionais } ou null em caso de erro.
 * ============================================================================
 */
async function buscarTimeNoBackend(nomeTime) {
  try {
    // Montagem da URL com o parâmetro de consulta (Query Parameter @RequestParam String nome)
    const url = `${API_BASE_URL}?nome=${encodeURIComponent(nomeTime.trim())}`;

    // Disparo da requisição HTTP GET usando Fetch API nativa
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Tratamento de falha no retorno do backend
    if (!response.ok) {
      if (response.status === 404 || response.status === 500) {
        // Significa que o time não foi encontrado no banco de dados
        return null;
      }
      throw new Error(`Erro na consulta HTTP: Status ${response.status} (${response.statusText})`);
    }

    // Leitura e conversão da resposta JSON em objeto literal JavaScript
    const timeDados = await response.json();
    return timeDados;

  } catch (erro) {
    console.warn(`[GET /time?nome=${nomeTime}] Aviso na consulta:`, erro.message);
    return null;
  }
}

/**
 * ============================================================================
 * FUNÇÃO: tratarBuscaPorNome()
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Captura o termo digitado pelo usuário no campo de busca, dispara a requisição GET
 *    e atualiza a tela exibindo apenas o time retornado pelo backend.
 *
 * 2. MANIPULAÇÃO DO DOM:
 *    - Lê o valor de 'dom.inputSearchNome.value'.
 *    - Ativa o spinner de carregamento ('dom.loadingState.style.display = 'flex'').
 *    - Caso encontre, insere o time na lista e renderiza os cards/tabela.
 *    - Caso não encontre, exibe o estado de lista vazia ('dom.emptyState.style.display = 'flex'').
 * ============================================================================
 */
async function tratarBuscaPorNome() {
  const termo = dom.inputSearchNome.value.trim();

  if (!termo) {
    exibirToast('CAMPO DE BUSCA VAZIO', 'Informe o nome de um time para consultar no banco.', 'warning');
    return;
  }

  exibirCarregando(true);

  try {
    const time = await buscarTimeNoBackend(termo);

    if (time) {
      // Adiciona o nome do time à lista de rastreados se ainda não estiver
      adicionarAoHistoricoLocal(time.nome);

      // Atualiza a visualização contendo apenas este time encontrado
      appState.times = [time];
      renderizarDadosNaTela();
      exibirToast('TIME LOCALIZADO // GET 200 OK', `Dados de "${time.nome}" recuperados do banco PostgreSQL!`, 'success');
    } else {
      appState.times = [];
      renderizarDadosNaTela();
      exibirToast('TIME NÃO ENCONTRADO', `Nenhum time com o nome "${termo}" foi localizado no backend.`, 'error');
    }
  } catch (erro) {
    exibirToast('ERRO DE COMUNICAÇÃO', erro.message, 'error');
  } finally {
    exibirCarregando(false);
  }
}

/**
 * ============================================================================
 * FUNÇÃO: carregarTimesIniciais()
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Sincroniza os times com o backend. Como o endpoint Java atual fornece
 *    'GET /time?nome={nome}', esta função consulta individualmente cada time
 *    registrado no histórico local (armazenado no localStorage) e reconstrói
 *    o catálogo com os dados mais recentes do banco PostgreSQL.
 *
 * 2. PROMISES / ASYNC-AWAIT:
 *    Utiliza 'Promise.all()' para realizar as consultas GET concorrentemente,
 *    maximizando a velocidade de resposta sem alterar nenhuma linha do backend Java.
 * ============================================================================
 */
async function carregarTimesIniciais() {
  exibirCarregando(true);

  try {
    const nomesRastreados = obterHistoricoLocal();

    if (nomesRastreados.length === 0) {
      // Nenhum time rastreado no momento
      appState.times = [];
      renderizarDadosNaTela();
      return;
    }

    // Dispara múltiplas requisições GET em paralelo usando Promise.all()
    const promessas = nomesRastreados.map(nome => buscarTimeNoBackend(nome));
    const resultados = await Promise.all(promessas);

    // Filtra apenas os times que realmente existem no banco de dados (ignora nulos)
    appState.times = resultados.filter(time => time !== null);

    // Atualiza o histórico local removendo eventuais times que foram deletados externamente
    const nomesValidos = appState.times.map(t => t.nome);
    salvarHistoricoLocal(nomesValidos);

    // Renderiza os dados atualizados nos elementos visuais do DOM
    renderizarDadosNaTela();

  } catch (erro) {
    console.error('Falha ao carregar times iniciais:', erro);
    exibirToast('ERRO DE SINCRONIZAÇÃO', 'Não foi possível consultar os dados no servidor backend.', 'error');
  } finally {
    exibirCarregando(false);
  }
}

// ============================================================================
// 3. OPERAÇÃO CREATE (POST) & UPDATE (PUT)
// ============================================================================

/**
 * ============================================================================
 * FUNÇÃO: tratarSubmissaoFormulario(evento)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Intercepta o evento padrão 'submit' do formulário HTML. Verifica se a operação
 *    atual é uma criação (POST) ou uma edição de time existente (PUT).
 *
 * 2. FLUXO DECISÓRIO:
 *    - Se 'appState.timeEmEdicaoId' for NULL -> Dispara a requisição CREATE (POST).
 *    - Se 'appState.timeEmEdicaoId' possuir valor numérico -> Dispara UPDATE (PUT).
 * ============================================================================
 */
async function tratarSubmissaoFormulario(evento) {
  // Impede o recarregamento tradicional da página pelo navegador
  evento.preventDefault();

  // Coleta e sanitiza os dados dos inputs do formulário
  const nome = dom.timeNome.value.trim();
  const tierValor = dom.timeTier.value;
  const starPlayer = dom.timeStarPlayer.value.trim();
  const internacionaisValor = dom.timeInternacionais.value;

  // Validação básica dos campos obrigatórios
  if (!nome || !tierValor || !starPlayer || internacionaisValor === '') {
    exibirToast('CAMPOS OBRIGATÓRIOS', 'Por favor, preencha todos os campos do formulário.', 'warning');
    return;
  }

  // Monta o payload estruturado exatamente como a entidade Java 'Time.java' espera:
  // { nome: String, tier: Integer, starPlayer: String, internacionais: Boolean }
  const timePayload = {
    nome: nome,
    tier: parseInt(tierValor, 10),
    starPlayer: starPlayer,
    internacionais: internacionaisValor === 'true'
  };

  // Desabilita o botão para evitar cliques duplicados durante a requisição de rede
  dom.btnSubmitForm.disabled = true;
  dom.btnSubmitText.textContent = 'TRANSMITINDO PROTOCOLO...';

  try {
    if (appState.timeEmEdicaoId !== null) {
      // Executa o UPDATE (PUT /time?id={id})
      await executarRequisicaoPut(appState.timeEmEdicaoId, timePayload);
    } else {
      // Executa o CREATE (POST /time)
      await executarRequisicaoPost(timePayload);
    }

    // Limpa o formulário e restaura o estado padrão
    resetarFormulario();

    // Sincroniza a lista atualizada com o banco de dados
    await carregarTimesIniciais();

  } catch (erro) {
    console.error('Erro na submissão do formulário:', erro);
    exibirToast('ERRO NA OPERAÇÃO', erro.message, 'error');
  } finally {
    // Restaura o estado visual do botão
    dom.btnSubmitForm.disabled = false;
    atualizarTextosDoFormulario();
  }
}

/**
 * ============================================================================
 * FUNÇÃO: executarRequisicaoPost(timePayload)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Envia uma requisição HTTP POST para cadastrar um novo time no banco de dados.
 *    Mapeado no backend Java em: TimeController.java -> @PostMapping salvarTime(@RequestBody Time time)
 *
 * 2. CONSTRUÇÃO DA REQUISIÇÃO HTTP (FETCH API):
 *    - Método HTTP: 'POST'
 *    - URL: `${API_BASE_URL}` (ex: http://localhost:8080/time)
 *    - Cabeçalhos (Headers):
 *           'Content-Type': 'application/json' -> ESSENCIAL para que o Spring Boot (Jackson ObjectMapper)
 *           compreenda que o corpo da requisição está no formato JSON e consiga desserializá-lo para a classe Time.
 *    - Corpo da Requisição (Body):
 *           JSON.stringify(timePayload) -> Converte o objeto JavaScript em uma string JSON padronizada.
 *
 * 3. PROCESSAMENTO DA RESPOSTA (ASYNC / AWAIT / PROMISE):
 *    - 'await fetch(...)': Envia os dados e aguarda a resposta do servidor.
 *    - 'response.ok': O controller Java retorna 'ResponseEntity.ok().build()', gerando código HTTP 200 sem corpo.
 *    - Se 'response.ok' for falso, lança um erro com os detalhes da falha.
 *
 * 4. MANIPULAÇÃO DO DOM / INTERFACE VISUAL:
 *    - Registra o nome do novo time no histórico para consulta.
 *    - Exibe uma notificação Toast de sucesso em verde VCT/Radiant.
 * ============================================================================
 */
async function executarRequisicaoPost(timePayload) {
  const url = API_BASE_URL;

  // Disparo da requisição POST com cabeçalho e corpo serializado
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(timePayload)
  });

  if (!response.ok) {
    throw new Error(`Falha ao cadastrar time (HTTP ${response.status}). Verifique se o nome já existe no banco.`);
  }

  // Registra o nome do time para que ele passe a ser consultado e exibido
  adicionarAoHistoricoLocal(timePayload.nome);

  exibirToast('TIME CADASTRADO COM SUCESSO', `Equipe "${timePayload.nome}" gravada no PostgreSQL (POST 200 OK)!`, 'success');
}

/**
 * ============================================================================
 * FUNÇÃO: executarRequisicaoPut(id, timePayload)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Envia uma requisição HTTP PUT para atualizar os dados de um time existente pelo ID.
 *    Mapeado no backend Java em: TimeController.java -> @PutMapping atualizarTimeporId(@RequestBody Time time, @RequestParam Integer id)
 *
 * 2. CONSTRUÇÃO DA REQUISIÇÃO HTTP (FETCH API):
 *    - Método HTTP: 'PUT'
 *    - URL: `${API_BASE_URL}?id=${encodeURIComponent(id)}`
 *           Note que o backend Java espera o ID como Query Parameter (@RequestParam Integer id).
 *    - Cabeçalhos (Headers):
 *           'Content-Type': 'application/json'
 *    - Corpo da Requisição (Body):
 *           JSON.stringify(timePayload) -> Contém os dados atualizados a serem mesclados pelo TimeService.
 *
 * 3. PROCESSAMENTO DA RESPOSTA (ASYNC / AWAIT / PROMISE):
 *    - Aguarda o retorno HTTP 200 OK do backend Java.
 *    - Valida o status e lança exceção caso ocorra falha (ex: time não encontrado pelo ID).
 *
 * 4. MANIPULAÇÃO DO DOM / INTERFACE VISUAL:
 *    - Sai do modo de edição, reseta os textos do formulário e notifica o usuário.
 * ============================================================================
 */
async function executarRequisicaoPut(id, timePayload) {
  // Constrói a URL passando o ID no parâmetro de consulta (?id=...)
  const url = `${API_BASE_URL}?id=${encodeURIComponent(id)}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(timePayload)
  });

  if (!response.ok) {
    throw new Error(`Falha ao atualizar time (HTTP ${response.status}). ID: ${id}`);
  }

  // Garante que o novo nome também esteja no histórico caso tenha sido alterado
  adicionarAoHistoricoLocal(timePayload.nome);

  exibirToast('ATUALIZAÇÃO CONCLUÍDA', `Dados do time "${timePayload.nome}" atualizados com sucesso (PUT 200 OK)!`, 'info');
}

// ============================================================================
// 4. OPERAÇÃO DELETE: EXCLUSÃO COM CONFIRMAÇÃO
// ============================================================================

/**
 * ============================================================================
 * FUNÇÃO: abrirModalExclusao(nomeTime)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Interrompe a ação imediata de exclusão e exibe um modal estilizado de confirmação,
 *    evitando exclusões acidentais no banco de dados.
 *
 * 2. MANIPULAÇÃO DO DOM:
 *    - Armazena 'nomeTime' no estado global 'appState.timeParaExclusaoNome'.
 *    - Atualiza o elemento de texto '#modalTeamNameTarget' com o nome do time.
 *    - Altera o display do backdrop do modal para 'flex'.
 * ============================================================================
 */
function abrirModalExclusao(nomeTime) {
  appState.timeParaExclusaoNome = nomeTime;
  dom.modalTeamNameTarget.textContent = nomeTime;
  dom.deleteModalBackdrop.style.display = 'flex';
}

/**
 * Fecha a janela modal de exclusão e limpa a variável temporária.
 */
function fecharModalExclusao() {
  appState.timeParaExclusaoNome = null;
  dom.deleteModalBackdrop.style.display = 'none';
}

/**
 * ============================================================================
 * FUNÇÃO: executarExclusaoConfirmada()
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Executa a requisição HTTP DELETE direcionada ao backend Java após o usuário
 *    clicar no botão "CONFIRMAR EXCLUSÃO" dentro do modal.
 *    Mapeado no backend Java em: TimeController.java -> @DeleteMapping deletarTimePorNome(@RequestParam String nome)
 *
 * 2. CONSTRUÇÃO DA REQUISIÇÃO HTTP (FETCH API):
 *    - Método HTTP: 'DELETE'
 *    - URL: `${API_BASE_URL}?nome=${encodeURIComponent(nomeTime)}`
 *           O backend Java espera o parâmetro 'nome' via Query Parameter (@RequestParam String nome).
 *    - Cabeçalhos (Headers):
 *           Nenhum corpo é enviado na requisição DELETE, portanto Content-Type não é obrigatório.
 *
 * 3. PROCESSAMENTO DA RESPOSTA (ASYNC / AWAIT / PROMISE):
 *    - 'await fetch(...)': Executa a chamada assíncrona DELETE.
 *    - Verifica se 'response.ok' retornou código 200 OK.
 *
 * 4. MANIPULAÇÃO DO DOM / INTERFACE VISUAL:
 *    - Remove o time do array em memória 'appState.times'.
 *    - Remove o nome do time do localStorage.
 *    - Fecha o modal de confirmação.
 *    - Re-renderiza a listagem de cards/tabela e atualiza os contadores de métricas.
 *    - Dispara notificação Toast avisando sobre a remoção.
 * ============================================================================
 */
async function executarExclusaoConfirmada() {
  const nomeTime = appState.timeParaExclusaoNome;

  if (!nomeTime) return;

  dom.btnModalConfirmDelete.disabled = true;
  dom.btnModalConfirmDelete.textContent = 'DELETANDO...';

  try {
    const url = `${API_BASE_URL}?nome=${encodeURIComponent(nomeTime)}`;

    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Falha ao deletar time no backend (HTTP ${response.status}).`);
    }

    // Remove do estado em memória
    appState.times = appState.times.filter(t => t.nome !== nomeTime);

    // Remove do histórico de persistência local
    removerDoHistoricoLocal(nomeTime);

    // Se o time excluído estiver sendo editado no formulário, cancela o modo edição
    if (dom.timeNome.value.trim() === nomeTime) {
      cancelarModoEdicao();
    }

    // Atualiza a visualização no DOM
    renderizarDadosNaTela();

    exibirToast('PROTOCOLO ELIMINADO', `O time "${nomeTime}" foi removido do banco de dados (DELETE 200 OK).`, 'warning');

  } catch (erro) {
    console.error('Erro ao deletar time:', erro);
    exibirToast('ERRO NA EXCLUSÃO', erro.message, 'error');
  } finally {
    dom.btnModalConfirmDelete.disabled = false;
    dom.btnModalConfirmDelete.textContent = 'CONFIRMAR EXCLUSÃO (DELETE)';
    fecharModalExclusao();
  }
}

// ============================================================================
// 5. PREPARAÇÃO PARA EDIÇÃO (INICIAR MODO PUT)
// ============================================================================

/**
 * ============================================================================
 * FUNÇÃO: prepararEdicao(time)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Preenche o formulário automaticamente com os dados atuais do time selecionado,
 *    trocando a interface para o modo de atualização (PUT).
 *
 * 2. MANIPULAÇÃO DO DOM:
 *    - Preenche os inputs: timeId, timeNome, timeTier, timeStarPlayer, timeInternacionais.
 *    - Altera o título do formulário para "ATUALIZAR TIME".
 *    - Altera o botão principal para "SALVAR ALTERAÇÕES (PUT)".
 *    - Torna visível o banner superior com alerta de edição ativa.
 *    - Faz rolagem suave (scrollIntoView) até o formulário.
 * ============================================================================
 */
function prepararEdicao(time) {
  appState.timeEmEdicaoId = time.id;

  // Preenchimento dos campos do formulário
  dom.timeId.value = time.id || '';
  dom.timeNome.value = time.nome || '';
  dom.timeTier.value = time.tier !== undefined ? time.tier.toString() : '';
  dom.timeStarPlayer.value = time.starPlayer || '';
  dom.timeInternacionais.value = time.internacionais ? 'true' : 'false';

  // Atualização dos elementos de cabeçalho do formulário
  dom.formTitle.textContent = 'ATUALIZAR TIME';
  dom.formModeSubtitle.textContent = 'MODO DE OPERAÇÃO: ATUALIZAÇÃO (PUT)';
  dom.btnSubmitText.textContent = 'SALVAR ALTERAÇÕES (PUT)';

  // Exibição da faixa de aviso de edição ativa
  dom.editTeamNameDisplay.textContent = time.nome;
  dom.editTeamIdDisplay.textContent = `ID DO REGISTRO: #${time.id}`;
  dom.editModeIndicator.style.display = 'flex';

  // Rola até o formulário na tela
  dom.teamForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

  exibirToast('MODO DE EDIÇÃO ATIVADO', `Editando time "${time.nome}" (ID: #${time.id}).`, 'info');
}

/**
 * Cancela o modo de edição e restaura o formulário para o modo de criação (POST).
 */
function cancelarModoEdicao() {
  appState.timeEmEdicaoId = null;
  resetarFormulario();
  atualizarTextosDoFormulario();
}

/**
 * Limpa todos os campos do formulário e restaura a visualização padrão.
 */
function resetarFormulario() {
  dom.teamForm.reset();
  dom.timeId.value = '';
  appState.timeEmEdicaoId = null;
  atualizarTextosDoFormulario();
}

/**
 * Atualiza os textos dos botões e títulos do formulário de acordo com o modo atual.
 */
function atualizarTextosDoFormulario() {
  if (appState.timeEmEdicaoId !== null) {
    dom.formTitle.textContent = 'ATUALIZAR TIME';
    dom.formModeSubtitle.textContent = 'MODO DE OPERAÇÃO: ATUALIZAÇÃO (PUT)';
    dom.btnSubmitText.textContent = 'SALVAR ALTERAÇÕES (PUT)';
    dom.editModeIndicator.style.display = 'flex';
  } else {
    dom.formTitle.textContent = 'CADASTRAR TIME';
    dom.formModeSubtitle.textContent = 'MODO DE OPERAÇÃO: CRIAÇÃO (POST)';
    dom.btnSubmitText.textContent = 'CADASTRAR TIME (POST)';
    dom.editModeIndicator.style.display = 'none';
  }
}

// ============================================================================
// 6. RENDERIZAÇÃO VISUAL (CARDS, TABELA E MÉTRICAS)
// ============================================================================

/**
 * ============================================================================
 * FUNÇÃO: renderizarDadosNaTela()
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Orquestra a atualização completa dos elementos visuais da tela.
 *    Avalia se a lista está vazia ou preenchida e direciona a renderização
 *    para o modo Cards ou Tabela conforme a seleção do usuário.
 *
 * 2. MANIPULAÇÃO DO DOM:
 *    - Atualiza as métricas (Total, Tier 1, Internacionais).
 *    - Exibe ou esconde o 'dom.emptyState'.
 *    - Chama 'renderizarCards()' ou 'renderizarTabela()'.
 * ============================================================================
 */
function renderizarDadosNaTela() {
  const times = appState.times;

  // Atualiza os contadores no topo
  atualizarMetricas(times);

  // Se não houver times, exibe o Empty State
  if (times.length === 0) {
    dom.emptyState.style.display = 'flex';
    dom.cardsGrid.innerHTML = '';
    dom.tableBody.innerHTML = '';
    return;
  }

  // Oculta o estado de vazio
  dom.emptyState.style.display = 'none';

  // Renderiza conforme o modo ativo
  if (appState.modoVisualizacao === 'cards') {
    dom.cardsGrid.style.display = 'grid';
    dom.tableContainer.style.display = 'none';
    renderizarCards(times);
  } else {
    dom.cardsGrid.style.display = 'none';
    dom.tableContainer.style.display = 'block';
    renderizarTabela(times);
  }
}

/**
 * ============================================================================
 * FUNÇÃO: renderizarCards(times)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Gera dinamicamente os cartões estéticos inspirados no design do Valorant
 *    para cada time retornado pelo backend.
 *
 * 2. MANIPULAÇÃO DO DOM:
 *    - Limpa o conteúdo anterior de 'dom.cardsGrid.innerHTML'.
 *    - Para cada objeto 'time', cria uma estrutura com classes específicas,
 *      badges de Tier (1, 2 ou 3), indicador internacional e botões com
 *      ouvintes de evento (addEventListener) para 'Editar' e 'Excluir'.
 * ============================================================================
 */
function renderizarCards(times) {
  dom.cardsGrid.innerHTML = '';

  times.forEach(time => {
    // Cria o elemento de container do card
    const card = document.createElement('article');
    card.className = 'vct-team-card';
    card.setAttribute('data-tier', time.tier || '3');

    // Mapeamento visual das categorias de Tier do Valorant
    const tierNome = time.tier === 1 ? 'TIER 1 // VCT' : time.tier === 2 ? 'TIER 2 // ASCENSION' : 'TIER 3 // PREMIER';
    const tierClasse = time.tier === 1 ? 'badge-tier-1' : time.tier === 2 ? 'badge-tier-2' : 'badge-tier-3';

    // Badge Internacional
    const intlHtml = time.internacionais
      ? `<span class="intl-badge intl-yes">
           <svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
           MASTERS / CHAMPIONS
         </span>`
      : `<span class="intl-badge intl-no">CIRCUITO DOMÉSTICO</span>`;

    // Montagem do corpo interno do Card
    card.innerHTML = `
      <div class="card-accent-bar"></div>
      <header class="card-header">
        <div>
          <span class="card-team-id">REGISTRO ID #${time.id ?? '---'}</span>
          <h3 class="card-team-name">${escapeHtml(time.nome)}</h3>
        </div>
        <span class="tier-badge ${tierClasse}">${tierNome}</span>
      </header>

      <div class="card-body">
        <div class="card-spec-row">
          <span class="spec-label">
            <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="22" y1="12" x2="18" y2="12"></line>
              <line x1="6" y1="12" x2="2" y2="12"></line>
              <line x1="12" y1="6" x2="12" y2="2"></line>
              <line x1="12" y1="22" x2="12" y2="18"></line>
            </svg>
            STAR PLAYER:
          </span>
          <span class="star-player-badge">
            <strong class="spec-value">${escapeHtml(time.starPlayer)}</strong>
          </span>
        </div>

        <div class="card-spec-row">
          <span class="spec-label">STATUS GLOBAL:</span>
          <div>${intlHtml}</div>
        </div>
      </div>

      <footer class="card-actions">
        <button type="button" class="btn-card-action btn-card-edit" title="Editar dados deste time">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          EDITAR (PUT)
        </button>
        <button type="button" class="btn-card-action btn-card-delete" title="Excluir este time do banco">
          <svg class="icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          EXCLUIR (DELETE)
        </button>
      </footer>
    `;

    // Vincula os eventos diretamente nos botões do Card
    const btnEditar = card.querySelector('.btn-card-edit');
    const btnExcluir = card.querySelector('.btn-card-delete');

    btnEditar.addEventListener('click', () => prepararEdicao(time));
    btnExcluir.addEventListener('click', () => abrirModalExclusao(time.nome));

    dom.cardsGrid.appendChild(card);
  });
}

/**
 * ============================================================================
 * FUNÇÃO: renderizarTabela(times)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Gera as linhas <tr> da tabela tática alternativa com todos os registros de times.
 *
 * 2. MANIPULAÇÃO DO DOM:
 *    - Limpa 'dom.tableBody.innerHTML'.
 *    - Cria elementos <tr> com células formatadas para ID, Nome, Tier, Star Player,
 *      Status Internacional e botões de ação para Editar e Excluir.
 * ============================================================================
 */
function renderizarTabela(times) {
  dom.tableBody.innerHTML = '';

  times.forEach(time => {
    const tr = document.createElement('tr');

    const tierDesc = time.tier === 1 ? 'Tier 1 (VCT)' : time.tier === 2 ? 'Tier 2 (Ascension)' : 'Tier 3 (Premier)';
    const intlDesc = time.internacionais ? 'SIM (Champions/Masters)' : 'NÃO (Doméstico)';

    tr.innerHTML = `
      <td><code>#${time.id ?? '---'}</code></td>
      <td><span class="table-team-name">${escapeHtml(time.nome)}</span></td>
      <td><span class="spec-value">${tierDesc}</span></td>
      <td><strong style="color: var(--color-cyan);">${escapeHtml(time.starPlayer)}</strong></td>
      <td>${intlDesc}</td>
      <td class="table-actions">
        <button type="button" class="btn-table-edit" title="Editar time">EDITAR</button>
        <button type="button" class="btn-table-delete" title="Excluir time">EXCLUIR</button>
      </td>
    `;

    // Vincula eventos nos botões da tabela
    const btnEditar = tr.querySelector('.btn-table-edit');
    const btnExcluir = tr.querySelector('.btn-table-delete');

    btnEditar.addEventListener('click', () => prepararEdicao(time));
    btnExcluir.addEventListener('click', () => abrirModalExclusao(time.nome));

    dom.tableBody.appendChild(tr);
  });
}

/**
 * Atualiza os números das métricas no cabeçalho do painel de controle.
 */
function atualizarMetricas(times) {
  const total = times.length;
  const tier1Count = times.filter(t => t.tier === 1).length;
  const intlCount = times.filter(t => t.internacionais === true).length;

  dom.metricTotal.textContent = total;
  dom.metricTier1.textContent = tier1Count;
  dom.metricInternacionais.textContent = intlCount;
}

/**
 * Alterna entre os modos de exibição 'cards' e 'tabela'.
 */
function alternarVisualizacao(modo) {
  appState.modoVisualizacao = modo;

  if (modo === 'cards') {
    dom.btnViewCards.classList.add('active');
    dom.btnViewTable.classList.remove('active');
  } else {
    dom.btnViewTable.classList.add('active');
    dom.btnViewCards.classList.remove('active');
  }

  renderizarDadosNaTela();
}

/**
 * Controla a exibição visual do estado de carregamento (Spinner).
 */
function exibirCarregando(carregando) {
  dom.loadingState.style.display = carregando ? 'flex' : 'none';
  if (carregando) {
    dom.cardsGrid.style.display = 'none';
    dom.tableContainer.style.display = 'none';
    dom.emptyState.style.display = 'none';
  }
}

// ============================================================================
// 7. SISTEMA DE NOTIFICAÇÕES (TOASTS / KILLFEED STYLE)
// ============================================================================
/**
 * ============================================================================
 * FUNÇÃO: exibirToast(titulo, mensagem, tipo)
 * ============================================================================
 * 1. OBJETIVO / O QUE FAZ:
 *    Cria um alerta temporário dinâmico na tela inspirado no Killfeed do Valorant.
 *
 * 2. PARÂMETROS:
 *    - titulo: Texto de destaque da ação.
 *    - mensagem: Detalhes explicativos do retorno HTTP.
 *    - tipo: 'success' | 'error' | 'warning' | 'info'
 * ============================================================================
 */
function exibirToast(titulo, mensagem, tipo = 'info') {
  const toast = document.createElement('div');
  toast.className = `vct-toast toast-${tipo}`;

  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(titulo)}</div>
      <div class="toast-message">${escapeHtml(mensagem)}</div>
    </div>
  `;

  dom.toastContainer.appendChild(toast);

  // Remove automaticamente após 4 segundos com animação suave
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

// ============================================================================
// 8. PERSISTÊNCIA LOCAL DE HISTÓRICO DE NOMES (CLIENT-SIDE INDEX)
// ============================================================================
// Como o backend atual possui apenas 'GET /time?nome={nome}' (sem endpoint de listar todos),
// mantemos uma lista de times rastreados no localStorage para sincronização automática.

function obterHistoricoLocal() {
  try {
    const salvo = localStorage.getItem(appState.chaveStorage);
    // Se ainda não houver nenhum time salvo no navegador, inicia com lista vazia []
    return salvo ? JSON.parse(salvo) : [];
  } catch {
    return [];
  }
}

function salvarHistoricoLocal(listaNomes) {
  try {
    // Garante nomes únicos e limpos
    const unicos = Array.from(new Set(listaNomes.map(n => n.trim()))).filter(Boolean);
    localStorage.setItem(appState.chaveStorage, JSON.stringify(unicos));
  } catch (e) {
    console.warn('Falha ao salvar no localStorage:', e);
  }
}

function adicionarAoHistoricoLocal(novoNome) {
  const lista = obterHistoricoLocal();
  if (!lista.some(nome => nome.toLowerCase() === novoNome.toLowerCase())) {
    lista.push(novoNome);
    salvarHistoricoLocal(lista);
  }
}

function removerDoHistoricoLocal(nomeParaRemover) {
  const lista = obterHistoricoLocal();
  const atualizada = lista.filter(nome => nome.toLowerCase() !== nomeParaRemover.toLowerCase());
  salvarHistoricoLocal(atualizada);
}

// ============================================================================
// 9. FUNÇÕES UTILITÁRIAS E DEMO
// ============================================================================
/**
 * Preenche o formulário com dados pré-configurados de times para agilizar testes.
 */
function preencherFormularioComDemo(chave) {
  const timesDemo = {
    loud: { nome: 'LOUD', tier: '1', starPlayer: 'Less', internacionais: 'true' },
    sentinels: { nome: 'Sentinels', tier: '1', starPlayer: 'TenZ', internacionais: 'true' },
    fnatic: { nome: 'Fnatic', tier: '1', starPlayer: 'Derke', internacionais: 'true' },
    prx: { nome: 'Paper Rex', tier: '1', starPlayer: 'f0rsakeN', internacionais: 'true' }
  };

  const dados = timesDemo[chave];
  if (dados) {
    dom.timeNome.value = dados.nome;
    dom.timeTier.value = dados.tier;
    dom.timeStarPlayer.value = dados.starPlayer;
    dom.timeInternacionais.value = dados.internacionais;
    exibirToast('DADOS CARREGADOS', `Formulário preenchido com dados da equipe "${dados.nome}".`, 'info');
  }
}

/**
 * Escapa caracteres HTML para prevenir ataques de injeção XSS.
 */
function escapeHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
