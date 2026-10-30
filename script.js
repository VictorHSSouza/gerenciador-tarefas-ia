"use strict";

(() => {
  const { STATUSES, validateForm, newId, filterTasks, countTasks } = globalThis.TaskManager.rules;
  const storage = globalThis.TaskManager.storage.createStorage();
  let tasks = [];
  let editingId = null;
  let selectedId = null;
  let deletingId = null;
  const view = globalThis.TaskManager.view.createTaskView({
    openForm, openDetails, openDelete, changeStatus, saveTask, deleteTask,
    render, editSelectedTask,
    onDialogClose: reloadWhenNoDialog,
  });
  const { notify, showError } = view;

  function findTask(id) {
    return tasks.find((task) => task.id === id);
  }

  function render() {
    view.render({ tasks, counts: countTasks(tasks), visibleTasks: filterTasks(tasks, view.readFilters()) });
  }

  function openForm(id = null) {
    view.prepareForm(id);
    editingId = id;
    const task = id ? findTask(id) : null;
    if (id && !task) {
      notify("Esta tarefa não está mais disponível.", true);
      return;
    }
    view.showForm(task);
  }

  function openDetails(id) {
    const task = findTask(id);
    if (!task) return;
    selectedId = id;
    view.showDetails(task);
  }

  function openDelete(id) {
    const task = findTask(id);
    if (!task) return;
    deletingId = id;
    view.showDelete(task);
  }

  function changeStatus(id, status) {
    const saved = persistTasks(tasks.map((task) => task.id === id ? { ...task, status } : task));
    if (saved) notify(`Tarefa marcada como ${STATUSES[status].toLowerCase()}.`);
    return saved;
  }

  function editSelectedTask() {
    view.closeDialog("details-dialog");
    openForm(selectedId);
  }

  function reloadWhenNoDialog() {
    if (!view.hasOpenDialog()) loadTasks();
  }

  function loadTasks() {
    try {
      tasks = storage.readTasks();
      showError("storage-warning", "");
    } catch {
      showError("storage-warning", "Não foi possível ler as tarefas salvas. O armazenamento pode estar indisponível ou conter dados inválidos. As alterações estão bloqueadas para preservar seus dados. Verifique as permissões do navegador e recarregue a página. Nenhum dado salvo foi apagado.");
    }
    render();
  }

  // Só atualiza a interface depois da escrita bem-sucedida. Falhas preservam o estado anterior.
  function persistTasks(nextTasks) {
    try {
      const result = storage.writeTasks(nextTasks);
      if (result === "unavailable") {
        notify("Não foi possível salvar: resolva o aviso de armazenamento e recarregue a página.", true);
        return false;
      }
      if (result === "conflict") {
        loadTasks();
        notify("As tarefas mudaram em outra aba. A lista foi atualizada; confira os dados antes de tentar novamente.", true);
        return false;
      }
      tasks = nextTasks;
      render();
      return true;
    } catch {
      notify("Não foi possível salvar. Verifique o espaço e as permissões do navegador. A alteração não foi aplicada.", true);
      return false;
    }
  }

  function saveTask(values) {
    const { title, description, invalidField, error } = validateForm(values);
    if (error) {
      showError("form-error", error);
      view.focusField(invalidField);
      return;
    }
    if (editingId && !tasks.some((task) => task.id === editingId)) {
      showError("form-error", "Esta tarefa foi excluída em outra aba. Feche o formulário e confira a lista.");
      return;
    }
    const task = { id: editingId || newId(tasks), title, description, priority: values.priority, deadline: values.deadline, status: values.status };
    const nextTasks = editingId ? tasks.map((item) => item.id === editingId ? task : item) : [task, ...tasks];
    if (persistTasks(nextTasks)) {
      view.closeDialog("task-dialog");
      notify(editingId ? "Tarefa atualizada com sucesso." : "Tarefa criada com sucesso.");
    } else showError("form-error", "A tarefa não foi salva. Confira o aviso na página e tente novamente. Seus campos foram mantidos.");
  }

  function deleteTask() {
    if (!tasks.some((task) => task.id === deletingId)) {
      showError("delete-error", "Esta tarefa não está mais disponível. Feche esta janela e confira a lista.");
      return;
    }
    if (persistTasks(tasks.filter((task) => task.id !== deletingId))) {
      view.closeDialog("delete-dialog");
      notify("Tarefa excluída com sucesso.");
    } else showError("delete-error", "Não foi possível excluir a tarefa. Confira o aviso na página e tente novamente.");
  }

  view.bindEvents();
  window.addEventListener("storage", (event) => {
    if (event.key !== storage.key && event.key !== null) return;
    if (view.hasOpenDialog()) {
      notify("As tarefas mudaram em outra aba. Feche as janelas abertas para atualizar a lista antes de continuar.", true);
      return;
    }
    loadTasks();
  });
  window.addEventListener("focus", reloadWhenNoDialog);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) reloadWhenNoDialog();
  });
  loadTasks();
})();
