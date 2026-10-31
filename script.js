const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const typingEl = document.getElementById("typing");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearBtn = document.getElementById("clearBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const toastEl = document.getElementById("toast");
const conversationListEl = document.getElementById("conversationList");

const HISTORY_KEY = "al3r0i_ezk_chat_v1";
const CHATS_KEY = "al3r0i_ezk_conversations_v1";
let chats = [];
let activeChatId = null;
let busy = false;
let toastTimer;

function createId() {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createChat(messages = [], title = "Nova conversa") {
  return {
    id: createId(),
    title,
    updatedAt: Date.now(),
    messages: Array.isArray(messages) ? messages : []
  };
}

function validMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.filter((m) =>
    m && ["user", "assistant"].includes(m.role) && typeof m.content === "string"
  ).slice(-40);
}

function loadChats() {
  try {
    const stored = JSON.parse(localStorage.getItem(CHATS_KEY) || "null");
    if (Array.isArray(stored)) {
      chats = stored
        .filter((chat) => chat && typeof chat.id === "string")
        .map((chat) => ({
          id: chat.id,
          title: typeof chat.title === "string" && chat.title.trim() ? chat.title : "Nova conversa",
          updatedAt: Number(chat.updatedAt) || Date.now(),
          messages: validMessages(chat.messages)
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      activeChatId = localStorage.getItem(`${CHATS_KEY}:active`);
      if (!chats.some((chat) => chat.id === activeChatId)) activeChatId = chats[0]?.id || null;
      if (!chats.length) {
        const firstChat = createChat();
        chats = [firstChat];
        activeChatId = firstChat.id;
        persistChats();
      }
      return;
    }
  } catch {
    chats = [];
  }

  // Migração: preserva a conversa antiga salva na versão anterior.
  try {
    const legacy = validMessages(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
    if (legacy.length) {
      const firstUserMessage = legacy.find((m) => m.role === "user")?.content || "Conversa anterior";
      const migrated = createChat(legacy, makeTitle(firstUserMessage));
      chats = [migrated];
      activeChatId = migrated.id;
      persistChats();
      return;
    }
  } catch {
    // Um histórico antigo inválido não impede o chat de iniciar.
  }

  const firstChat = createChat();
  chats = [firstChat];
  activeChatId = firstChat.id;
  persistChats();
}

function persistChats() {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    if (activeChatId) localStorage.setItem(`${CHATS_KEY}:active`, activeChatId);
    else localStorage.removeItem(`${CHATS_KEY}:active`);
    // Mantém a chave legada atualizada para compatibilidade com versões anteriores.
    const active = getActiveChat();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(active?.messages || []));
  } catch {
    showToast("Não consegui salvar. O armazenamento deste dispositivo pode estar cheio.");
  }
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) || null;
}

function getActiveMessages() {
  const active = getActiveChat();
  return active ? active.messages : [];
}

function makeTitle(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "Nova conversa";
  return clean.length >  30 ? clean.slice(0,  30 - 1).trimEnd() + "…" : clean;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function scrollToBottom() {
  const area = document.getElementById("chatArea");
  requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; });
}

function appendMessage(role, content) {
  const article = document.createElement("article");
  article.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "assistant" ? "A" : "TU";

  const body = document.createElement("div");
  body.className = "message-body";

  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = role === "assistant" ? "AL3R0I.EZK" : "VOCÊ";

  const text = document.createElement("div");
  text.className = "message-text";
  text.textContent = content;

  body.append(name, text);
  article.append(avatar, body);
  messagesEl.appendChild(article);
  scrollToBottom();
  return article;
}

function renderHistory() {
  const messages = getActiveMessages();
  messagesEl.replaceChildren();
  welcomeEl.classList.toggle("hidden", messages.length > 0);
  messages.forEach((item) => appendMessage(item.role, item.content));
  renderConversationList();
  scrollToBottom();
}

function renderConversationList() {
  if (!conversationListEl) return;
  conversationListEl.replaceChildren();
  const countEl = document.getElementById("historyCount");
  if (countEl) countEl.textContent = String(chats.length);

  const ordered = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!ordered.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "Suas conversas aparecerão aqui.";
    conversationListEl.appendChild(empty);
    return;
  }

  ordered.forEach((chat) => {
    const item = document.createElement("div");
    item.className = `conversation-item${chat.id === activeChatId ? " active" : ""}`;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "conversation-open";
    open.textContent = chat.title;
    open.title = chat.title;
    open.addEventListener("click", () => openChat(chat.id));

    const actions = document.createElement("div");
    actions.className = "conversation-actions";

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "conversation-action";
    rename.textContent = "✎";
    rename.title = "Renomear conversa";
    rename.setAttribute("aria-label", `Renomear ${chat.title}`);
    rename.addEventListener("click", () => renameChat(chat.id));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "conversation-action delete";
    remove.textContent = "×";
    remove.title = "Excluir conversa";
    remove.setAttribute("aria-label", `Excluir ${chat.title}`);
    remove.addEventListener("click", () => deleteChat(chat.id));

    actions.append(rename, remove);
    item.append(open, actions);
    conversationListEl.appendChild(item);
  });
}

function openChat(id) {
  if (busy || !chats.some((chat) => chat.id === id)) return;
  activeChatId = id;
  persistChats();
  renderHistory();
  sidebar.classList.remove("open");
  messageInput.focus();
}

function startNewChat() {
  if (busy) return;
  const chat = createChat();
  chats.unshift(chat);
  activeChatId = chat.id;
  persistChats();
  renderHistory();
  sidebar.classList.remove("open");
  messageInput.value = "";
  messageInput.style.height = "auto";
  messageInput.focus();
}

function renameChat(id) {
  if (busy) return;
  const chat = chats.find((item) => item.id === id);
  if (!chat) return;
  const proposed = window.prompt("Novo nome da conversa:", chat.title);
  if (proposed === null) return;
  const title = proposed.trim();
  if (!title) {
    showToast("O nome não pode ficar vazio.");
    return;
  }
  chat.title = title.slice(0, 60);
  chat.updatedAt = Date.now();
  persistChats();
  renderConversationList();
  showToast("Conversa renomeada.");
}

function deleteChat(id) {
  if (busy) return;
  const chat = chats.find((item) => item.id === id);
  if (!chat) return;
  if (!window.confirm(`Excluir a conversa "${chat.title}"? Essa ação não pode ser desfeita.`)) return;

  chats = chats.filter((item) => item.id !== id);
  if (activeChatId === id) activeChatId = chats[0]?.id || null;
  if (!activeChatId) {
    const replacement = createChat();
    chats.unshift(replacement);
    activeChatId = replacement.id;
  }
  persistChats();
  renderHistory();
  showToast("Conversa excluída.");
}

function clearCurrentChat() {
  if (busy) return;
  const active = getActiveChat();
  if (!active || !active.messages.length) {
    showToast("Essa conversa já está vazia.");
    return;
  }
  if (!window.confirm("Limpar as mensagens desta conversa? Ela continuará salva no histórico.")) return;
  active.messages = [];
  active.title = "Nova conversa";
  active.updatedAt = Date.now();
  persistChats();
  renderHistory();
  messageInput.value = "";
  messageInput.style.height = "auto";
  messageInput.focus();
  showToast("Mensagens limpas. A conversa continua no histórico.");
}

function setBusy(value) {
  busy = value;
  sendBtn.disabled = value;
  messageInput.disabled = value;
  newChatBtn.disabled = value;
  clearBtn.disabled = value;
  typingEl.classList.toggle("hidden", !value);
  if (!value) messageInput.focus();
  scrollToBottom();
}

async function sendMessage(rawText) {
  const content = rawText.trim();
  if (!content || busy) return;

  let active = getActiveChat();
  if (!active) {
    active = createChat();
    chats.unshift(active);
    activeChatId = active.id;
  }

  const wasEmpty = active.messages.length === 0;
  active.messages.push({ role: "user", content });
  active.messages = active.messages.slice(-40);
  if (wasEmpty || active.title === "Nova conversa") active.title = makeTitle(content);
  active.updatedAt = Date.now();

  welcomeEl.classList.add("hidden");
  appendMessage("user", content);
  persistChats();
  renderConversationList();
  messageInput.value = "";
  messageInput.style.height = "auto";
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: active.messages.slice(-16) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não consegui falar com o servidor.");
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("A IA retornou uma resposta vazia. Tenta de novo.");
    }

    active.messages.push({ role: "assistant", content: data.reply.trim() });
    active.messages = active.messages.slice(-40);
    active.updatedAt = Date.now();
    persistChats();
    if (active.id === activeChatId) appendMessage("assistant", data.reply.trim());
    renderConversationList();
  } catch (error) {
    const message = error instanceof TypeError
      ? "Não consegui alcançar o servidor. Confere se o site está publicado e tenta de novo."
      : (error.message || "Algo deu errado. Tenta de novo.");
    active.messages.push({ role: "assistant", content: message });
    active.messages = active.messages.slice(-40);
    active.updatedAt = Date.now();
    persistChats();
    if (active.id === activeChatId) appendMessage("assistant", message);
  } finally {
    setBusy(false);
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(messageInput.value);
});

messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 160)}px`;
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    if (busy) return;
    messageInput.value = button.dataset.prompt || "";
    chatForm.requestSubmit();
  });
});

newChatBtn.addEventListener("click", startNewChat);
clearBtn.addEventListener("click", clearCurrentChat);
menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", (event) => {
  if (sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menuBtn.contains(event.target)) sidebar.classList.remove("open");
});

loadChats();
renderHistory();
