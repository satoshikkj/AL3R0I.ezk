(() => {
  "use strict";
  const KEY = "al3r0i_ezk_memory_v1";
  const MAX_ITEMS = 30;
  const MAX_LENGTH = 240;
  let memories = [];
  const $ = (id) => document.getElementById(id);

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      memories = Array.isArray(parsed) ? parsed
        .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
        .map((item) => ({ id: item.id, text: item.text.trim().slice(0, MAX_LENGTH), updatedAt: Number(item.updatedAt) || Date.now() }))
        .filter((item) => item.text)
        .slice(0, MAX_ITEMS) : [];
    } catch { memories = []; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(memories)); return true; }
    catch { notify("Não consegui salvar. O armazenamento pode estar cheio."); return false; }
  }
  function notify(message) {
    const toast = $("toast");
    if (toast) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }
  }
  function getAll() { return memories.map(({text}) => text); }
  function render() {
    const list = $("memoryList");
    const count = $("memoryCount");
    if (!list) return;
    count.textContent = memories.length + "/" + MAX_ITEMS;
    list.replaceChildren();
    if (!memories.length) {
      const empty = document.createElement("div");
      empty.className = "memory-empty";
      empty.textContent = "Nenhuma memória salva. Você decide o que merece ser lembrado.";
      list.appendChild(empty);
      return;
    }
    memories.forEach((memory) => {
      const item = document.createElement("div"); item.className = "memory-item";
      const content = document.createElement("p"); content.textContent = memory.text;
      const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Editar";
      edit.addEventListener("click", () => {
        const value = window.prompt("Editar memória:", memory.text);
        if (value === null) return;
        const clean = value.trim().slice(0, MAX_LENGTH);
        if (!clean) { notify("A memória não pode ficar vazia."); return; }
        memory.text = clean; memory.updatedAt = Date.now();
        if (persist()) { render(); notify("Memória atualizada."); }
      });
      const remove = document.createElement("button"); remove.type = "button"; remove.className = "memory-delete"; remove.textContent = "Apagar";
      remove.addEventListener("click", () => {
        if (!window.confirm("Apagar esta memória?")) return;
        memories = memories.filter((entry) => entry.id !== memory.id);
        if (persist()) { render(); notify("Memória apagada."); }
      });
      item.append(content, edit, remove); list.appendChild(item);
    });
  }
  function open() { render(); $("memoryOverlay").classList.remove("hidden"); $("memoryOverlay").setAttribute("aria-hidden","false"); $("memoryText").focus(); }
  function close() { $("memoryOverlay").classList.add("hidden"); $("memoryOverlay").setAttribute("aria-hidden","true"); }
  function init() {
    load();
    const form = $("memoryForm");
    const input = $("memoryText");
    const counter = $("memoryCounter");
    $("memoryBtn").addEventListener("click", open);
    $("memoryClose").addEventListener("click", close);
    $("memoryOverlay").addEventListener("click", (event) => { if (event.target === $("memoryOverlay")) close(); });
    input.addEventListener("input", () => { counter.textContent = input.value.length + "/" + MAX_LENGTH; });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim().slice(0, MAX_LENGTH);
      if (!text) return;
      if (memories.length >= MAX_ITEMS) { notify("Limite de 30 memórias. Apague uma antes de adicionar outra."); return; }
      if (memories.some((item) => item.text.toLocaleLowerCase("pt-BR") === text.toLocaleLowerCase("pt-BR"))) { notify("Essa memória já existe."); return; }
      memories.unshift({ id: "mem_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,7), text, updatedAt: Date.now() });
      if (persist()) { input.value = ""; counter.textContent = "0/" + MAX_LENGTH; render(); notify("Memória guardada."); }
    });
    $("memoryClearAll").addEventListener("click", () => {
      if (!memories.length) { notify("Não há memórias para apagar."); return; }
      if (!window.confirm("Apagar TODAS as memórias salvas neste dispositivo?")) return;
      memories = [];
      if (persist()) { render(); notify("Todas as memórias foram apagadas."); }
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("memoryOverlay").classList.contains("hidden")) close(); });
  }
  window.AL3R0I_MEMORY = Object.freeze({ getAll });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();