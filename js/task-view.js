"use strict";

(() => {
  const { PRIORITIES, STATUSES, isOverdue } = globalThis.TaskManager.rules;

  function createTaskView(actions) {
    const getElement = (id) => document.getElementById(id);
    const form = getElement("task-form");
    let notificationTimer;

    function formatDate(value) {
      return value.split("-").reverse().join("/");
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
        const saved = actions.changeStatus(task.id, status);
        if (!saved) toggle.checked = task.status === "completed";
      });
      const content = createElement("div", "task-content");
      const title = createElement("button", "task-title", task.title);
      title.type = "button";
      title.setAttribute("aria-label", `Consultar detalhes: ${task.title}`);
      title.addEventListener("click", () => actions.openDetails(task.id));
      content.append(title);
      if (task.description) content.append(createElement("p", "task-excerpt", task.description));
      const metadata = createElement("div", "task-meta");
      addMetadata(metadata, task);
      content.append(metadata);
      const actionContainer = createElement("div", "task-actions");
      actionContainer.append(
        actionButton("Detalhes", "", () => actions.openDetails(task.id)),
        actionButton("Editar", "", () => actions.openForm(task.id)),
        actionButton("Excluir", "delete-action", () => actions.openDelete(task.id))
      );
      card.append(toggle, content, actionContainer);
      return card;
    }

    function render({ tasks, counts, visibleTasks }) {
      getElement("total-count").textContent = counts.total;
      getElement("pending-count").textContent = counts.pending;
      getElement("completed-count").textContent = counts.completed;
      getElement("overdue-count").textContent = counts.overdue;
      getElement("task-list").replaceChildren(...visibleTasks.map(createTaskCard));
      getElement("results-count").textContent = `${visibleTasks.length} de ${tasks.length} tarefas`;
      getElement("empty-state").hidden = visibleTasks.length > 0;
      getElement("empty-title").textContent = tasks.length ? "Nenhuma tarefa encontrada" : "Tudo começa com uma tarefa";
      getElement("empty-description").textContent = tasks.length ? "Experimente outro título ou ajuste os filtros." : "Adicione seu primeiro passo e organize o que vem a seguir.";
      getElement("empty-create").hidden = tasks.length > 0;
    }

    function prepareForm(id) {
      form.reset();
      showError("form-error", "");
      getElement("form-title").textContent = id ? "Editar tarefa" : "Nova tarefa";
    }

    function showForm(task) {
      if (task) {
        for (const field of ["title", "description", "priority", "deadline", "status"]) {
          form.elements.namedItem(field).value = task[field];
        }
      }
      getElement("task-dialog").showModal();
      getElement("task-title").focus();
    }

    function showDetails(task) {
      getElement("details-title").textContent = task.title;
      getElement("details-description").textContent = task.description || "Nenhuma descrição adicionada.";
      getElement("details-meta").replaceChildren();
      addMetadata(getElement("details-meta"), task);
      getElement("details-dialog").showModal();
    }

    function showDelete(task) {
      showError("delete-error", "");
      getElement("delete-description").textContent = `Você está prestes a excluir “${task.title}”.`;
      getElement("delete-dialog").showModal();
    }

    function readFilters() {
      return {
        query: getElement("search").value,
        status: getElement("status-filter").value,
        priority: getElement("priority-filter").value,
      };
    }

    function hasOpenDialog() {
      return Boolean(document.querySelector("dialog[open]"));
    }

    function closeDialog(id) {
      getElement(id).close();
    }

    function focusField(id) {
      getElement(id).focus();
    }

    function bindEvents() {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        actions.saveTask(Object.fromEntries(new FormData(form)));
      });
      getElement("confirm-delete").addEventListener("click", actions.deleteTask);
      getElement("new-task").addEventListener("click", () => actions.openForm());
      getElement("empty-create").addEventListener("click", () => actions.openForm());
      getElement("details-edit").addEventListener("click", actions.editSelectedTask);
      document.querySelectorAll("[data-close]").forEach((button) => {
        button.addEventListener("click", () => closeDialog(button.dataset.close));
      });
      getElement("search").addEventListener("input", actions.render);
      getElement("status-filter").addEventListener("change", actions.render);
      getElement("priority-filter").addEventListener("change", actions.render);
      getElement("clear-filters").addEventListener("click", () => {
        getElement("search").value = "";
        getElement("status-filter").value = "all";
        getElement("priority-filter").value = "all";
        actions.render();
      });
      document.querySelectorAll("dialog").forEach((dialog) => {
        dialog.addEventListener("close", actions.onDialogClose);
      });
    }

    return {
      notify, showError, render, prepareForm, showForm, showDetails, showDelete,
      readFilters, hasOpenDialog, closeDialog, focusField, bindEvents,
    };
  }

  globalThis.TaskManager.view = { createTaskView };
})();
