"use strict";

(() => {
  const PRIORITIES = { low: "Baixa", medium: "Média", high: "Alta" };
  const STATUSES = { pending: "Pendente", completed: "Concluída" };
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

  function newId(tasks) {
    let id;
    do {
      id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    } while (tasks.some((task) => task.id === id));
    return id;
  }

  // Validação do formulário mantém a ordem e as mensagens originais.
  function validateForm(values) {
    const title = values.title.trim();
    const description = values.description.trim();
    let invalidField = null;
    let error = "";
    if (!title || title.length > 120) { error = "Informe um título com 1 a 120 caracteres, além de espaços."; invalidField = "task-title"; }
    else if (description.length > 2000) { error = "A descrição deve ter no máximo 2.000 caracteres."; invalidField = "task-description"; }
    else if (!isValidDate(values.deadline)) { error = "Informe um prazo válido, com dia, mês e ano entre 0001 e 9999."; invalidField = "task-deadline"; }
    else if (!Object.hasOwn(PRIORITIES, values.priority)) { error = "Selecione uma prioridade válida."; invalidField = "task-priority"; }
    else if (!Object.hasOwn(STATUSES, values.status)) { error = "Selecione um status válido."; invalidField = "task-status"; }
    return { title, description, invalidField, error };
  }

  function filterTasks(tasks, { query, status, priority }) {
    query = query.trim().toLocaleLowerCase("pt-BR");
    return tasks.filter((task) => task.title.toLocaleLowerCase("pt-BR").includes(query)
      && (status === "all" || task.status === status)
      && (priority === "all" || task.priority === priority));
  }

  function countTasks(tasks) {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      completed: tasks.filter((task) => task.status === "completed").length,
      overdue: tasks.filter(isOverdue).length,
    };
  }

  globalThis.TaskManager = { rules: { PRIORITIES, STATUSES, isValidDate, isOverdue, validateTask, validateForm, newId, filterTasks, countTasks } };
})();
