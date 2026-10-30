"use strict";

(() => {
  const { validateTask } = globalThis.TaskManager.rules;
  const STORAGE_KEY = "gerenciador-tarefas:v1";

  // O adaptador mantém somente o estado de persistência; não acessa o DOM.
  function createStorage() {
    let snapshot = null;
    let ready = false;

    function readTasks() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw === null ? [] : JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.every(validateTask)
            || new Set(parsed.map((task) => task.id)).size !== parsed.length) {
          throw new Error("Formato de armazenamento inválido");
        }
        // Mantém a seleção original de campos, sem migrar ou regravar dados.
        const tasks = parsed.map(({ id, title, description, priority, deadline, status }) =>
          ({ id, title, description, priority, deadline, status }));
        snapshot = raw;
        ready = true;
        return tasks;
      } catch (error) {
        ready = false;
        throw error;
      }
    }

    function writeTasks(tasks) {
      if (!ready) return "unavailable";
      if (localStorage.getItem(STORAGE_KEY) !== snapshot) return "conflict";
      const serialized = JSON.stringify(tasks);
      localStorage.setItem(STORAGE_KEY, serialized);
      snapshot = serialized;
      return "saved";
    }

    return { key: STORAGE_KEY, readTasks, writeTasks };
  }

  globalThis.TaskManager.storage = { createStorage };
})();
