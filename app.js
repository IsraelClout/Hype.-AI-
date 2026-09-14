let user =
  JSON.parse(localStorage.getItem("hypeUser"));

let chats =
  JSON.parse(localStorage.getItem("hypeChats") || "[]");

let currentChat = [];

const $ = id =>
  document.getElementById(id);


/* AUTH */

function signup() {

  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!name || !email || !password) {
    $("authMsg").textContent =
      "Fill in all fields.";
    return;
  }

  user = {
    name,
    email,
    password
  };

  localStorage.setItem(
    "hypeUser",
    JSON.stringify(user)
  );

  startApp();
}


function login() {

  const saved =
    JSON.parse(
      localStorage.getItem("hypeUser")
    );

  if (!saved) {
    $("authMsg").textContent =
      "Create an account first.";
    return;
  }

  if (
    $("email").value !== saved.email ||
    $("password").value !== saved.password
  ) {
    $("authMsg").textContent =
      "Incorrect login details.";
    return;
  }

  user = saved;

  startApp();
}


function logout() {

  location.reload();

}


/* START */

function startApp() {

  $("auth").classList.add("hidden");

  $("app").classList.remove("hidden");

  $("username").textContent =
    user.name;

  loadMemory();

}


if (user) {
  startApp();
}


/* MEMORY */

function loadMemory() {

  const memory =
    JSON.parse(
      localStorage.getItem(
        "hypeMemory"
      ) || "[]"
    );

  return memory;
}


function remember(text) {

  const memory =
    loadMemory();

  memory.push(text);

  localStorage.setItem(
    "hypeMemory",
    JSON.stringify(
      memory.slice(-30)
    )
  );

}


/* ASK */

function ask(text) {

  $("message").value =
    text;

  $("message").focus();

}


async function send(event) {

  event.preventDefault();

  const input =
    $("message");

  const text =
    input.value.trim();

  if (!text) return;

  input.value = "";

  addMessage(
    "user",
    text
  );

  currentChat.push({
    role:"user",
    content:text
  });

  remember(
    `User said: ${text}`
  );


  try {

    addMessage(
      "ai",
      "⚡ Hype.AI is thinking..."
    );

    const response =
      await fetch(
        "/api/chat",
        {
          method:"POST",

          headers:{
            "Content-Type":
              "application/json"
          },

          body:JSON.stringify({

            message:text,

            history:
              currentChat.slice(-10),

            memory:
              loadMemory().slice(-15),

            user:user

          })
        }
      );


    const data =
      await response.json();


    document
      .querySelector(
        ".message:last-child"
      )
      .remove();


    if (!response.ok)
      throw new Error(data.error);


    addMessage(
      "ai",
      data.answer
    );

    currentChat.push({
      role:"assistant",
      content:data.answer
    });

    remember(
      `AI: ${data.answer.slice(0,250)}`
    );


    /* AUTO VOICE */

    speak(data.answer);


    /* SAVE CHAT */

    chats.push({
      date:Date.now(),
      messages:currentChat
    });

    localStorage.setItem(
      "hypeChats",
      JSON.stringify(
        chats.slice(-20)
      )
    );


  } catch(error) {

    document
      .querySelector(
        ".message:last-child"
      )
      .remove();

    addMessage(
      "ai",
      "❌ Error: " +
      error.message
    );

  }

}


/* MESSAGE */

function addMessage(
  role,
  text
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message " + role;

  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.innerHTML =
    escapeHTML(text)
      .replace(/\n/g,"<br>");


  if (role === "ai") {

    const tools =
      document.createElement("div");

    tools.className =
      "tools";

    tools.innerHTML = `

      <button onclick="copyText(this)">
        📋 Copy
      </button>

      <button onclick="speak(this.parentElement.parentElement.innerText)">
        🔊 Speak
      </button>

      <button onclick="regenerate()">
        🔄 Regenerate
      </button>

    `;

    bubble.appendChild(tools);

  }


  wrapper.appendChild(
    bubble
  );

  $("chat").appendChild(
    wrapper
  );

  $("chat").scrollTop =
    $("chat").scrollHeight;

}


function escapeHTML(text) {

  const div =
    document.createElement("div");

  div.textContent =
    text;

  return div.innerHTML;

}


/* COPY */

function copyText(button) {

  const text =
    button.parentElement
      .parentElement
      .innerText
      .replace(/📋 Copy|🔊 Speak|🔄 Regenerate/g,"");

  navigator.clipboard.writeText(
    text.trim()
  );

  button.textContent =
    "✓ Copied";

  setTimeout(
    () =>
      button.textContent = "📋 Copy",
    1500
  );

}


/* VOICE */

function speak(text) {

  if (!("speechSynthesis" in window))
    return;

  speechSynthesis.cancel();

  const voice =
    new SpeechSynthesisUtterance(
      text
    );

  voice.lang =
    "en-GH";

  voice.rate =
    1;

  speechSynthesis.speak(
    voice
  );

}


/* VOICE INPUT */

function voiceInput() {

  const Speech =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Speech) {

    alert(
      "Voice input is not supported."
    );

    return;

  }

  const recognition =
    new Speech();

  recognition.lang =
    "en-GH";

  recognition.start();

  recognition.onresult =
    event => {

      $("message").value =
        event.results[0][0].transcript;

    };

}


/* NEW CHAT */

function newChat() {

  currentChat = [];

  $("chat").innerHTML = `

    <div class="welcome">

      <div class="logo">H</div>

      <h2>
        New conversation 🚀
      </h2>

      <p>
        What would you like to talk about?
      </p>

    </div>

  `;

}


/* REGENERATE */

function regenerate() {

  const userMessages =
    currentChat.filter(
      x => x.role === "user"
    );

  const last =
    userMessages[
      userMessages.length - 1
    ];

  if (!last) return;

  $("message").value =
    last.content;

  document
    .querySelectorAll(
      ".message.ai"
    )
    .forEach(
      el => el.remove()
    );

  document
    .querySelector(
      ".input"
    )
    .requestSubmit();

}
