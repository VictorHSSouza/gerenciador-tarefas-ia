"use strict";

(() => {
  const STORAGE_KEY = "gerenciador-tarefas:v1";
  const PRIORITIES = { low: "Baixa", medium: "Média", high: "Alta" };
  const STATUSES = { pending: "Pendente", completed: "Concluída" };
  const getElement = (id) => document.getElementById(id);
  const form = getElement("task-form");
  let tasks = [];
  let storageSnapshot = null;
  let storageReady = false;
  let editingId = null;
  let selectedId = null;
  let deletingId = null;
  let notificationTimer;

  // Compare datas civis como strings ISO para evitar deslocamentos de fuso horário.
  function todayISO() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  function isValidDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysPerMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= daysPerMonth[month - 1];
  }

  function formatDate(value) {
    return value.split("-").reverse().join("/");
  }

  function isOverdue(task) {
    return task.status === "pending" && task.deadline < todayISO();
  }

  function validateTask(task) {
    return task && typeof task === "object" && !Array.isArray(task)
      && typeof task.id === "string" && task.id.length > 0 && task.id.length <= 100
      && typeof task.title === "string" && task.title.trim().length > 0 && task.title.length <= 120
      && typeof task.description === "string" && task.description.length <= 2000
      && Object.hasOwn(PRIORITIES, task.priority) && Object.hasOwn(STATUSES, task.status)
      && isValidDate(task.deadline);
  }

  function notify(message, error = false) {
    const notification = getElement("notification");
    clearTimeout(notificationTimer);
    notification.textContent = message;
    notification.classList.toggle("error", error);
    notification.hidden = false;
    notificationTimer = setTimeout(() => { notification.hidden = true; }, 6500);
  }

  function showError(id, message) {
    const element = getElement(id);
    element.textContent = message;
    element.hidden = !message;
  }

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw === null ? [] : JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(validateTask)
          || new Set(parsed.map((task) => task.id)).size !== parsed.length) {
        throw new Error("Formato de armazenamento inválido");
      }
      // Somente campos conhecidos entram no estado da aplicação.
      tasks = parsed.map(({ id, title, description, priority, deadline, status }) =>
        ({ id, title, description, priority, deadline, status }));
      storageSnapshot = raw;
      storageReady = true;
      showError("storage-warning", "");
    } catch {
      storageReady = false;
      showError("storage-warning", "Não foi possível ler as tarefas salvas. O armazenamento pode estar indisponível ou conter dados inválidos. As alterações estão bloqueadas para preservar seus dados. Verifique as permissões do navegador e recarregue a página. Nenhum dado salvo foi apagado.");
    }
    render();
  }

  // Só atualiza a interface depois da escrita bem-sucedida. Falhas preservam o estado anterior.
  function persistTasks(nextTasks) {
    if (!storageReady) {
      notify("Não foi possível salvar: resolva o aviso de armazenamento e recarregue a página.", true);
      return false;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) !== storageSnapshot) {
        loadTasks();
        notify("As tarefas mudaram em outra aba. A lista foi atualizada; confira os dados antes de tentar novamente.", true);
        return false;
      }
      const serialized = JSON.stringify(nextTasks);
      localStorage.setItem(STORAGE_KEY, serialized);
      storageSnapshot = serialized;
      tasks = nextTasks;
      render();
      return true;
    } catch {
      notify("Não foi possível salvar. Verifique o espaço e as permissões do navegador. A alteração não foi aplicada.", true);
      return false;
    }
  }

  function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    // Dados do usuário nunca são interpretados como HTML.
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function addMetadata(container, task) {
    container.append(
      createElement("span", `badge priority-${task.priority}`, `Prioridade ${PRIORITIES[task.priority].toLowerCase()}`),
      createElement("span", `badge status-${task.status}`, STATUSES[task.status]),
      createElement("span", isOverdue(task) ? "overdue" : "", `${isOverdue(task) ? "Em atraso · " : "Prazo: "}${formatDate(task.deadline)}`)
    );
  }

  function actionButton(label, className, action) {
    const button = createElement("button", `button subtle ${className}`, label);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }

  function createTaskCard(task) {
    const card = createElement("article", `task-card ${task.status}`);
    const toggle = createElement("input", "task-toggle");
    toggle.type = "checkbox";
    toggle.checked = task.status === "completed";
    toggle.setAttribute("aria-label", `Marcar ${task.title} como ${toggle.checked ? "pendente" : "concluída"}`);
    toggle.addEventListener("change", () => {
      const status = toggle.checked ? "completed" : "pending";
      const saved = persistTasks(tasks.map((item) => item.id === task.id ? { ...item, status } : item));
      if (saved) notify(`Tarefa marcada como ${STATUSES[status].toLowerCase()}.`);
      else toggle.checked = task.status === "completed";
    });
    const content = createElement("div", "task-content");
    const title = createElement("button", "task-title", task.title);
    title.type = "button";
    title.setAttribute("aria-label", `Consultar detalhes: ${task.title}`);
    title.addEventListener("click", () => openDetails(task.id));
    content.append(title);
    if (task.description) content.append(createElement("p", "task-excerpt", task.description));
    const metadata = createElement("div", "task-meta");
    addMetadata(metadata, task);
    content.append(metadata);
    const actions = createElement("div", "task-actions");
    actions.append(
      actionButton("Detalhes", "", () => openDetails(task.id)),
      actionButton("Editar", "", () => openForm(task.id)),
      actionButton("Excluir", "delete-action", () => openDelete(task.id))
    );
    card.append(toggle, content, actions);
    return card;
  }

  function render() {
    getElement("total-count").textContent = tasks.length;
    getElement("pending-count").textContent = tasks.filter((task) => task.status === "pending").length;
    getElement("completed-count").textContent = tasks.filter((task) => task.status === "completed").length;
    getElement("overdue-count").textContent = tasks.filter(isOverdue).length;
    const query = getElement("search").value.trim().toLocaleLowerCase("pt-BR");
    const status = getElement("status-filter").value;
    const priority = getElement("priority-filter").value;
    const visibleTasks = tasks.filter((task) => task.title.toLocaleLowerCase("pt-BR").includes(query)
      && (status === "all" || task.status === status)
      && (priority === "all" || task.priority === priority));
    getElement("task-list").replaceChildren(...visibleTasks.map(createTaskCard));
    getElement("results-count").textContent = `${visibleTasks.length} de ${tasks.length} tarefas`;
    getElement("empty-state").hidden = visibleTasks.length > 0;
    getElement("empty-title").textContent = tasks.length ? "Nenhuma tarefa encontrada" : "Tudo começa com uma tarefa";
    getElement("empty-description").textContent = tasks.length ? "Experimente outro título ou ajuste os filtros." : "Adicione seu primeiro passo e organize o que vem a seguir.";
    getElement("empty-create").hidden = tasks.length > 0;
  }

  function openForm(id = null) {
    form.reset();
    showError("form-error", "");
    editingId = id;
    getElement("form-title").textContent = id ? "Editar tarefa" : "Nova tarefa";
    if (id) {
      const task = tasks.find((item) => item.id === id);
      if (!task) { notify("Esta tarefa não está mais disponível.", true); return; }
      for (const field of ["title", "description", "priority", "deadline", "status"]) {
        form.elements.namedItem(field).value = task[field];
      }
    }
    getElement("task-dialog").showModal();
    getElement("task-title").focus();
  }

  function openDetails(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    selectedId = id;
    getElement("details-title").textContent = task.title;
    getElement("details-description").textContent = task.description || "Nenhuma descrição adicionada.";
    getElement("details-meta").replaceChildren();
    addMetadata(getElement("details-meta"), task);
    getElement("details-dialog").showModal();
  }

  function openDelete(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    deletingId = id;
    showError("delete-error", "");
    getElement("delete-description").textContent = `Você está prestes a excluir “${task.title}”.`;
    getElement("delete-dialog").showModal();
  }

  function newId() {
    let id;
    do {
      id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    } while (tasks.some((task) => task.id === id));
    return id;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const title = values.title.trim();
    const description = values.description.trim();
    let invalidField = null;
    let error = "";
    if (!title || title.length > 120) { error = "Informe um título com 1 a 120 caracteres, além de espaços."; invalidField = "task-title"; }
    else if (description.length > 2000) { error = "A descrição deve ter no máximo 2.000 caracteres."; invalidField = "task-description"; }
    else if (!isValidDate(values.deadline)) { error = "Informe um prazo válido, com dia, mês e ano entre 0001 e 9999."; invalidField = "task-deadline"; }
    else if (!Object.hasOwn(PRIORITIES, values.priority)) { error = "Selecione uma prioridade válida."; invalidField = "task-priority"; }
    else if (!Object.hasOwn(STATUSES, values.status)) { error = "Selecione um status válido."; invalidField = "task-status"; }
    if (error) {
      showError("form-error", error);
      getElement(invalidField).focus();
      return;
    }
    if (editingId && !tasks.some((task) => task.id === editingId)) {
      showError("form-error", "Esta tarefa foi excluída em outra aba. Feche o formulário e confira a lista.");
      return;
    }
    const task = { id: editingId || newId(), title, description, priority: values.priority, deadline: values.deadline, status: values.status };
    const nextTasks = editingId ? tasks.map((item) => item.id === editingId ? task : item) : [task, ...tasks];
    if (persistTasks(nextTasks)) {
      getElement("task-dialog").close();
      notify(editingId ? "Tarefa atualizada com sucesso." : "Tarefa criada com sucesso.");
    } else showError("form-error", "A tarefa não foi salva. Confira o aviso na página e tente novamente. Seus campos foram mantidos.");
  });

  getElement("confirm-delete").addEventListener("click", () => {
    if (!tasks.some((task) => task.id === deletingId)) {
      showError("delete-error", "Esta tarefa não está mais disponível. Feche esta janela e confira a lista.");
      return;
    }
    if (persistTasks(tasks.filter((task) => task.id !== deletingId))) {
      getElement("delete-dialog").close();
      notify("Tarefa excluída com sucesso.");
    } else showError("delete-error", "Não foi possível excluir a tarefa. Confira o aviso na página e tente novamente.");
  });
  getElement("new-task").addEventListener("click", () => openForm());
  getElement("empty-create").addEventListener("click", () => openForm());
  getElement("details-edit").addEventListener("click", () => {
    getElement("details-dialog").close();
    openForm(selectedId);
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => getElement(button.dataset.close).close());
  });
  getElement("search").addEventListener("input", render);
  getElement("status-filter").addEventListener("change", render);
  getElement("priority-filter").addEventListener("change", render);
  getElement("clear-filters").addEventListener("click", () => {
    getElement("search").value = "";
    getElement("status-filter").value = "all";
    getElement("priority-filter").value = "all";
    render();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    // Mantém formulários abertos intactos e exige revisão antes de salvar edições antigas.
    if (document.querySelector("dialog[open]")) {
      notify("As tarefas mudaram em outra aba. Feche as janelas abertas para atualizar a lista antes de continuar.", true);
      return;
    }
    loadTasks();
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("close", () => {
      if (!document.querySelector("dialog[open]")) loadTasks();
    });
  });
  window.addEventListener("focus", () => {
    if (!document.querySelector("dialog[open]")) loadTasks();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !document.querySelector("dialog[open]")) loadTasks();
  });
  loadTasks();
})();
