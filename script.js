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
const SETTINGS_KEY = "al3r0i_ezk_settings_v1";
const DEFAULT_SETTINGS = Object.freeze({ responseLength: "equilibrada" });
let userSettings = { ...DEFAULT_SETTINGS };
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (saved && typeof saved === "object") {
      // Migração V3: preserva a preferência de tamanho e descarta controles antigos de personalidade.
      userSettings = {
        responseLength: ["curta", "equilibrada", "detalhada"].includes(saved.responseLength)
          ? saved.responseLength
          : DEFAULT_SETTINGS.responseLength
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    }
  } catch { userSettings = { ...DEFAULT_SETTINGS }; }
}
function renderSettings() {
  document.getElementById("responseLength").value = userSettings.responseLength;
}
function readSettingsForm() {
  return { responseLength: ["curta", "equilibrada", "detalhada"].includes(document.getElementById("responseLength").value)
    ? document.getElementById("responseLength").value
    : DEFAULT_SETTINGS.responseLength };
}
function closeSettings() {
  const overlay = document.getElementById("settingsOverlay");
  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
}
function saveSettings() {
  userSettings = readSettingsForm();
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    closeSettings();
    showToast("Preferências salvas.");
  } catch { showToast("Não consegui salvar as preferências neste dispositivo."); }
}

let chats = [];
let activeChatId = null;
let busy = false;
let toastTimer;

// V5 — modo de voz usando recursos Web Speech do navegador; sem API paga de voz.
const voiceBtn = document.getElementById("voiceBtn");
const voiceOverlay = document.getElementById("voiceOverlay");
const voiceClose = document.getElementById("voiceClose");
const voiceToggle = document.getElementById("voiceToggle");
const voiceStatus = document.getElementById("voiceStatus");
const voiceTranscript = document.getElementById("voiceTranscript");
const voiceOrb = document.getElementById("voiceOrb");
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let voiceActive = false;
let voiceListening = false;
let voiceProcessing = false;
let voiceFinalTranscript = "";
let voiceRecognition = null;
let voiceRestartTimer = null;

function setVoiceStatus(message, state = "") {
  voiceStatus.textContent = message;
  voiceOrb.classList.toggle("listening", state === "listening");
  voiceOrb.classList.toggle("speaking", state === "speaking");
  voiceToggle.innerHTML = state === "listening"
    ? "<span>■</span> Encerrar conversa"
    : "<span>🎙</span> Começar a falar";
}

function stopVoiceSession() {
  voiceActive = false;
  voiceListening = false;
  voiceProcessing = false;
  clearTimeout(voiceRestartTimer);
  if (voiceRecognition) {
    voiceRecognition.onend = null;
    try { voiceRecognition.abort(); } catch {}
    voiceRecognition = null;
  }
  window.speechSynthesis?.cancel();
  voiceOverlay.classList.add("hidden");
  voiceOverlay.setAttribute("aria-hidden", "true");
  voiceBtn.classList.remove("active");
  setVoiceStatus("Toque no microfone e comece a falar.");
}

function startVoiceListening() {
  if (!voiceActive || voiceListening || voiceProcessing || window.speechSynthesis?.speaking) return;
  if (!SpeechRecognitionAPI) {
    setVoiceStatus("Seu navegador não oferece reconhecimento de voz. Tente usar o Chrome atualizado.");
    return;
  }
  clearTimeout(voiceRestartTimer);
  voiceFinalTranscript = "";
  voiceListening = true;
  setVoiceStatus("Estou ouvindo. Pode falar...", "listening");
  voiceTranscript.textContent = "Ouvindo sua voz...";
  const recognition = new SpeechRecognitionAPI();
  voiceRecognition = recognition;
  recognition.lang = "pt-BR";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const phrase = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) voiceFinalTranscript += phrase + " ";
      else interim += phrase;
    }
    voiceTranscript.textContent = (voiceFinalTranscript + interim).trim() || "Ouvindo sua voz...";
  };
  recognition.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      voiceActive = false;
      voiceListening = false;
      setVoiceStatus("Permissão de microfone negada. Libere o microfone nas permissões do navegador.");
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
      setVoiceStatus("Falha no reconhecimento de voz: " + event.error + ".");
    }
  };
  recognition.onend = () => {
    voiceListening = false;
    if (!voiceActive) return;
    const spokenText = voiceFinalTranscript.trim();
    if (spokenText) {
      voiceProcessing = true;
      voiceTranscript.textContent = spokenText;
      setVoiceStatus("Processando sua mensagem...");
      sendMessage(spokenText, { fromVoice: true });
    } else {
      setVoiceStatus("Não captei sua fala. Tente novamente.");
      voiceRestartTimer = setTimeout(startVoiceListening, 900);
    }
  };
  try { recognition.start(); }
  catch {
    voiceListening = false;
    setVoiceStatus("Não consegui iniciar o microfone. Toque para tentar novamente.");
  }
}

function speakVoiceReply(text) {
  if (!voiceActive || !text || !window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) {
    voiceProcessing = false;
    if (voiceActive) voiceRestartTimer = setTimeout(startVoiceListening, 350);
    return;
  }
  const spoken = String(text)
    .replace(/\n\nFontes consultadas:[\s\S]*$/i, "")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/[*_#>]/g, " ")
    .trim();
  if (!spoken) {
    voiceProcessing = false;
    voiceRestartTimer = setTimeout(startVoiceListening, 350);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = "pt-BR";
  utterance.rate = 1.02;
  utterance.pitch = 0.92;
  const voices = window.speechSynthesis.getVoices();
  const portugueseVoice = voices.find((voice) => /^pt[-_]BR$/i.test(voice.lang))
    || voices.find((voice) => /^pt/i.test(voice.lang));
  if (portugueseVoice) utterance.voice = portugueseVoice;
  utterance.onstart = () => setVoiceStatus("AL3R0I está falando...", "speaking");
  utterance.onend = () => {
    voiceProcessing = false;
    if (voiceActive) {
      setVoiceStatus("Pode continuar. Estou ouvindo.");
      voiceRestartTimer = setTimeout(startVoiceListening, 300);
    }
  };
  utterance.onerror = () => {
    voiceProcessing = false;
    if (voiceActive) {
      setVoiceStatus("Não consegui reproduzir a voz. Verifique o áudio do dispositivo.");
      voiceRestartTimer = setTimeout(startVoiceListening, 900);
    }
  };
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function startVoiceSession() {
  if (!SpeechRecognitionAPI) {
    showToast("Reconhecimento de voz não disponível neste navegador. Use o Chrome atualizado.");
    return;
  }
  voiceActive = true;
  voiceBtn.classList.add("active");
  voiceOverlay.classList.remove("hidden");
  voiceOverlay.setAttribute("aria-hidden", "false");
  voiceTranscript.textContent = "Sua conversa aparecerá aqui.";
  setVoiceStatus("Preparando o microfone...");
  startVoiceListening();
}


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

async function sendMessage(rawText, options = {}) {
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
  let voiceReply = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: active.messages.slice(-20), settings: userSettings, memories: window.AL3R0I_MEMORY?.getAll() || [] })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Não consegui falar com o servidor.");
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("A IA retornou uma resposta vazia. Tenta de novo.");
    }

    voiceReply = data.reply.trim();
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
    // Erros de transporte não entram no histórico enviado ao modelo.
    // Isso evita que uma falha temporária seja interpretada como resposta da IA.
    if (active.id === activeChatId) appendMessage("assistant", message);
  } finally {
    setBusy(false);
    if (options.fromVoice) {
      if (voiceReply && voiceActive) speakVoiceReply(voiceReply);
      else {
        voiceProcessing = false;
        if (voiceActive) {
          setVoiceStatus("Não consegui obter uma resposta. Tente falar novamente.");
          voiceRestartTimer = setTimeout(startVoiceListening, 1000);
        }
      }
    }
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
voiceBtn.addEventListener("click", startVoiceSession);
voiceToggle.addEventListener("click", () => {
  if (voiceActive) stopVoiceSession();
  else startVoiceSession();
});
voiceClose.addEventListener("click", stopVoiceSession);
voiceOverlay.addEventListener("click", (event) => {
  if (event.target === voiceOverlay) stopVoiceSession();
});
clearBtn.addEventListener("click", clearCurrentChat);
menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
document.addEventListener("click", (event) => {
  if (sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) &&
      !menuBtn.contains(event.target)) sidebar.classList.remove("open");
});

loadSettings();
renderSettings();

document.getElementById("settingsBtn").addEventListener("click", () => { renderSettings(); const overlay=document.getElementById("settingsOverlay"); overlay.classList.remove("hidden"); overlay.setAttribute("aria-hidden","false"); });
document.getElementById("settingsClose").addEventListener("click",closeSettings);
document.getElementById("settingsSave").addEventListener("click",saveSettings);
document.getElementById("settingsReset").addEventListener("click",()=>{userSettings={...DEFAULT_SETTINGS};renderSettings();showToast("Padrões restaurados. Salve para aplicar.");});
document.getElementById("settingsOverlay").addEventListener("click",(event)=>{if(event.target.id==="settingsOverlay")closeSettings();});
document.addEventListener("keydown",(event)=>{if(event.key==="Escape"){closeSettings();if(voiceActive)stopVoiceSession();}});

loadChats();
renderHistory();
