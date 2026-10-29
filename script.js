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

const HISTORY_KEY = "al3r0i_ezk_chat_v1";
let history = [];
let busy = false;
let toastTimer;

try {
  const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  if (Array.isArray(saved)) history = saved.filter((m) =>
    m && ["user", "assistant"].includes(m.role) && typeof m.content === "string"
  ).slice(-40);
} catch { history = []; }

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

function saveHistory() {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40))); }
  catch { showToast("Não consegui salvar o histórico neste dispositivo."); }
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
  messagesEl.replaceChildren();
  welcomeEl.classList.toggle("hidden", history.length > 0);
  history.forEach((item) => appendMessage(item.role, item.content));
  scrollToBottom();
}

function setBusy(value) {
  busy = value;
  sendBtn.disabled = value;
  messageInput.disabled = value;
  typingEl.classList.toggle("hidden", !value);
  if (!value) messageInput.focus();
  scrollToBottom();
}

function resetChat() {
  if (busy) return;
  history = [];
  saveHistory();
  messagesEl.replaceChildren();
  welcomeEl.classList.remove("hidden");
  messageInput.value = "";
  messageInput.style.height = "auto";
  sidebar.classList.remove("open");
  messageInput.focus();
}

async function sendMessage(rawText) {
  const content = rawText.trim();
  if (!content || busy) return;

  welcomeEl.classList.add("hidden");
  history.push({ role: "user", content });
  history = history.slice(-40);
  appendMessage("user", content);
  saveHistory();
  messageInput.value = "";
  messageInput.style.height = "auto";
  setBusy(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-16) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não consegui falar com o servidor.");
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("A IA retornou uma resposta vazia. Tenta de novo.");
    }

    history.push({ role: "assistant", content: data.reply.trim() });
    history = history.slice(-40);
    appendMessage("assistant", data.reply.trim());
    saveHistory();
  } catch (error) {
    const message = error instanceof TypeError
      ? "Não consegui alcançar o servidor. Confere se o site está publicado e tenta de novo."
      : (error.message || "Algo deu errado. Tenta de novo.");
    appendMessage("assistant", message);
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

newChatBtn.addEventListener("click", resetChat);
clearBtn.addEventListener("click", () => {
  if (!history.length) {
    showToast("Essa conversa já está vazia.");
    return;
  }
  resetChat();
  showToast("Conversa limpa.");
});

menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", (event) => {
  if (sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menuBtn.contains(event.target)) sidebar.classList.remove("open");
});

renderHistory();