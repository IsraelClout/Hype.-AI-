// ======================================
// HYPE.AI
// Frontend Application
// ======================================

// ---------- ELEMENTS ----------

const authScreen =
  document.getElementById("authScreen");

const appScreen =
  document.getElementById("appScreen");

const loginForm =
  document.getElementById("loginForm");

const signupForm =
  document.getElementById("signupForm");

const loginTab =
  document.getElementById("loginTab");

const signupTab =
  document.getElementById("signupTab");

const authMessage =
  document.getElementById("authMessage");

const userName =
  document.getElementById("userName");

const chatBox =
  document.getElementById("chatBox");

const messageInput =
  document.getElementById("messageInput");

const sendBtn =
  document.getElementById("sendBtn");

const micBtn =
  document.getElementById("micBtn");

const logoutBtn =
  document.getElementById("logoutBtn");

const newChatBtn =
  document.getElementById("newChatBtn");

const welcome =
  document.getElementById("welcome");


// ---------- STATE ----------

let currentUser = null;

let chatHistory = [];

let lastUserMessage = "";


// ======================================
// AUTHENTICATION
// ======================================

function getUsers() {

  try {

    return JSON.parse(
      localStorage.getItem("hype_users") || "[]"
    );

  } catch {

    return [];

  }

}


function saveUsers(users) {

  localStorage.setItem(
    "hype_users",
    JSON.stringify(users)
  );

}


// ---------- TABS ----------

loginTab.addEventListener("click", () => {

  loginTab.classList.add("active");
  signupTab.classList.remove("active");

  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");

  authMessage.textContent = "";

});


signupTab.addEventListener("click", () => {

  signupTab.classList.add("active");
  loginTab.classList.remove("active");

  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");

  authMessage.textContent = "";

});


// ---------- SIGN UP ----------

signupForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    const name =
      document
        .getElementById("signupName")
        .value
        .trim();

    const email =
      document
        .getElementById("signupEmail")
        .value
        .trim()
        .toLowerCase();

    const password =
      document
        .getElementById("signupPassword")
        .value;

    if (!name || !email || !password) {

      authMessage.textContent =
        "Please complete all fields.";

      return;
    }

    const users = getUsers();

    const exists =
      users.some(
        user => user.email === email
      );

    if (exists) {

      authMessage.textContent =
        "An account with this email already exists.";

      return;
    }

    users.push({
      name,
      email,
      password
    });

    saveUsers(users);

    currentUser = {
      name,
      email
    };

    localStorage.setItem(
      "hype_session",
      JSON.stringify(currentUser)
    );

    openApp();

  }
);


// ---------- LOGIN ----------

loginForm.addEventListener(
  "submit",
  event => {

    event.preventDefault();

    const email =
      document
        .getElementById("loginEmail")
        .value
        .trim()
        .toLowerCase();

    const password =
      document
        .getElementById("loginPassword")
        .value;

    const users = getUsers();

    const user =
      users.find(
        item =>
          item.email === email &&
          item.password === password
      );

    if (!user) {

      authMessage.textContent =
        "Incorrect email or password.";

      return;
    }

    currentUser = {
      name: user.name,
      email: user.email
    };

    localStorage.setItem(
      "hype_session",
      JSON.stringify(currentUser)
    );

    openApp();

  }
);


// ---------- OPEN APP ----------

function openApp() {

  authScreen.classList.add("hidden");

  appScreen.classList.remove("hidden");

  userName.textContent =
    currentUser.name;

}


// ---------- LOGOUT ----------

logoutBtn.addEventListener(
  "click",
  () => {

    localStorage.removeItem(
      "hype_session"
    );

    currentUser = null;

    chatHistory = [];

    chatBox.innerHTML = "";

    appScreen.classList.add("hidden");

    authScreen.classList.remove("hidden");

  }
);


// ---------- CHECK SESSION ----------

function checkSession() {

  try {

    const session =
      JSON.parse(
        localStorage.getItem(
          "hype_session"
        )
      );

    if (session) {

      currentUser = session;

      openApp();

    }

  } catch {

    localStorage.removeItem(
      "hype_session"
    );

  }

}


// ======================================
// CHAT
// ======================================

async function sendMessage(customMessage = null) {

  const message =
    customMessage ||
    messageInput.value.trim();

  if (!message) return;

  lastUserMessage = message;

  messageInput.value = "";

  autoResize();

  welcome.classList.add("hidden");

  addMessage(
    message,
    "user"
  );

  const loading =
    addMessage(
      "Hype.AI is thinking...",
      "ai"
    );

  sendBtn.disabled = true;

  try {

    const response =
      await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message,
            messages: chatHistory
          })
        }
      );


    // Read text FIRST.
    // This prevents JSON parse crashes.

    const raw =
      await response.text();

    let data;

    try {

      data = JSON.parse(raw);

    } catch {

      console.error(
        "Server returned:",
        raw
      );

      throw new Error(
        "The server returned an invalid response."
      );

    }


    loading.remove();


    if (!response.ok || !data.success) {

      throw new Error(
        data.error ||
        "Hype.AI request failed."
      );

    }


    const reply =
      data.reply ||
      "I couldn't generate a response.";


    chatHistory.push({
      role: "user",
      content: message
    });

    chatHistory.push({
      role: "assistant",
      content: reply
    });


    // Keep history manageable

    if (chatHistory.length > 12) {

      chatHistory =
        chatHistory.slice(-12);

    }


    addAIMessage(
      reply,
      data.sources || []
    );


  } catch (error) {

    console.error(error);

    loading.remove();

    addMessage(
      "❌ " +
      error.message,
      "error"
    );

  } finally {

    sendBtn.disabled = false;

    messageInput.focus();

  }

}


// ======================================
// ADD USER MESSAGE
// ======================================

function addMessage(text, type) {

  const div =
    document.createElement("div");

  div.className =
    `message ${type}`;

  div.textContent = text;

  chatBox.appendChild(div);

  scrollToBottom();

  return div;

}


// ======================================
// ADD AI MESSAGE
// ======================================

function addAIMessage(
  text,
  sources = []
) {

  const div =
    document.createElement("div");

  div.className =
    "message ai";

  div.innerHTML =
    formatAIText(text);


  const actions =
    document.createElement("div");

  actions.className =
    "message-actions";


  // COPY

  const copyBtn =
    document.createElement("button");

  copyBtn.textContent =
    "📋 Copy";

  copyBtn.onclick =
    async () => {

      await navigator.clipboard.writeText(
        text
      );

      copyBtn.textContent =
        "✅ Copied";

      setTimeout(() => {

        copyBtn.textContent =
          "📋 Copy";

      }, 1500);

    };


  // SPEAK

  const speakBtn =
    document.createElement("button");

  speakBtn.textContent =
    "🔊 Speak";

  speakBtn.onclick =
    () => speak(text);


  // REGENERATE

  const regenerateBtn =
    document.createElement("button");

  regenerateBtn.textContent =
    "🔄 Regenerate";

  regenerateBtn.onclick =
    () => regenerate();


  actions.appendChild(copyBtn);

  actions.appendChild(speakBtn);

  actions.appendChild(regenerateBtn);


  div.appendChild(actions);


  // SOURCES

  if (sources.length > 0) {

    const sourceTitle =
      document.createElement("div");

    sourceTitle.style.marginTop =
      "12px";

    sourceTitle.innerHTML =
      "<strong>🌐 Sources</strong>";

    div.appendChild(sourceTitle);


    sources.forEach(source => {

      const link =
        document.createElement("a");

      link.href =
        source.url;

      link.target =
        "_blank";

      link.rel =
        "noopener noreferrer";

      link.textContent =
        "• " +
        (source.title || source.url);

      link.style.display =
        "block";

      link.style.marginTop =
        "5px";

      link.style.color =
        "#1769ff";

      div.appendChild(link);

    });

  }


  chatBox.appendChild(div);

  scrollToBottom();

}


// ======================================
// FORMAT AI TEXT
// ======================================

function formatAIText(text) {

  const escaped =
    String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");


  return escaped
    .replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    )
    .replace(
      /`([^`]+)`/g,
      "<code>$1</code>"
    )
    .replace(
      /\n/g,
      "<br>"
    );

}


// ======================================
// REGENERATE
// ======================================

function regenerate() {

  if (!lastUserMessage) return;

  // Remove previous assistant message

  const messages =
    chatBox.querySelectorAll(
      ".message.ai"
    );

  const last =
    messages[messages.length - 1];

  if (last) {
    last.remove();
  }

  // Remove last assistant history entry

  if (
    chatHistory.length &&
    chatHistory[
      chatHistory.length - 1
    ].role === "assistant"
  ) {

    chatHistory.pop();

  }

  sendMessage(lastUserMessage);

}


// ======================================
// NEW CHAT
// ======================================

newChatBtn.addEventListener(
  "click",
  () => {

    chatHistory = [];

    lastUserMessage = "";

    chatBox.innerHTML = "";

    welcome.classList.remove(
      "hidden"
    );

  }
);


// ======================================
// QUICK PROMPTS
// ======================================

document
  .querySelectorAll(".quick-prompt")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        sendMessage(
          button.dataset.prompt
        );

      }
    );

  });


// ======================================
// SEND BUTTON
// ======================================

sendBtn.addEventListener(
  "click",
  () => sendMessage()
);


// ======================================
// ENTER TO SEND
// ======================================

messageInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

  }
);


// ======================================
// TEXTAREA AUTO RESIZE
// ======================================

messageInput.addEventListener(
  "input",
  autoResize
);


function autoResize() {

  messageInput.style.height =
    "auto";

  messageInput.style.height =
    Math.min(
      messageInput.scrollHeight,
      120
    ) + "px";

}


// ======================================
// VOICE INPUT
// ======================================

let recognition = null;

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition;


if (SpeechRecognition) {

  recognition =
    new SpeechRecognition();

  recognition.lang =
    "en-US";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;


  recognition.onstart =
    () => {

      micBtn.classList.add(
        "active"
      );

      micBtn.textContent =
        "🔴";

    };


  recognition.onresult =
    event => {

      const text =
        event.results[0][0]
          .transcript;

      messageInput.value =
        text;

      autoResize();

    };


  recognition.onend =
    () => {

      micBtn.classList.remove(
        "active"
      );

      micBtn.textContent =
        "🎙️";

    };


  recognition.onerror =
    () => {

      micBtn.classList.remove(
        "active"
      );

      micBtn.textContent =
        "🎙️";

    };


  micBtn.addEventListener(
    "click",
    () => {

      try {

        recognition.start();

      } catch {}

    }
  );


} else {

  micBtn.addEventListener(
    "click",
    () => {

      alert(
        "Voice input is not supported in this browser."
      );

    }
  );

}


// ======================================
// TEXT TO SPEECH
// ======================================

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) return;

  speechSynthesis.cancel();

  const clean =
    text
      .replace(
        /```[\s\S]*?```/g,
        ""
      )
      .replace(
        /[*#_]/g,
        ""
      );

  const utterance =
    new SpeechSynthesisUtterance(
      clean
    );

  utterance.lang =
    "en-US";

  utterance.rate =
    1;

  utterance.pitch =
    1;

  speechSynthesis.speak(
    utterance
  );

}


// ======================================
// SCROLL
// ======================================

function scrollToBottom() {

  setTimeout(() => {

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });

  }, 50);

}


// ======================================
// START
// ======================================

checkSession();
