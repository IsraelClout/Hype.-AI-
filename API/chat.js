// ==========================================
// HYPE.AI API
// Mistral + Tavily
// Vercel Serverless Function
// ==========================================

export default async function handler(req, res) {

  // -----------------------------
  // CORS
  // -----------------------------

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  // -----------------------------
  // OPTIONS
  // -----------------------------

  if (req.method === "OPTIONS") {

    return res
      .status(200)
      .json({
        success: true
      });

  }


  // -----------------------------
  // METHOD
  // -----------------------------

  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        success: false,
        error: "Only POST requests are allowed."
      });

  }


  try {

    // -----------------------------
    // ENVIRONMENT VARIABLES
    // -----------------------------

    const MISTRAL_API_KEY =
      process.env.MISTRAL_API_KEY;

    const TAVILY_API_KEY =
      process.env.TAVILY_API_KEY;


    if (!MISTRAL_API_KEY) {

      return res
        .status(500)
        .json({
          success: false,
          error:
            "MISTRAL_API_KEY is missing on Vercel."
        });

    }


    // -----------------------------
    // REQUEST BODY
    // -----------------------------

    const body =
      req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const history =
      Array.isArray(body.messages)
        ? body.messages
        : [];


    if (!message) {

      return res
        .status(400)
        .json({
          success: false,
          error: "Message is required."
        });

    }


    // -----------------------------
    // SEARCH DETECTION
    // -----------------------------

    const lower =
      message.toLowerCase();


    const searchPatterns = [
      "today",
      "tonight",
      "latest",
      "current",
      "currently",
      "recent",
      "news",
      "breaking",
      "now",
      "this week",
      "this month",
      "price",
      "prices",
      "weather",
      "score",
      "scores",
      "results",
      "trending",
      "2026",
      "who is",
      "what happened",
      "election",
      "president"
    ];


    const needsSearch =
      searchPatterns.some(
        word =>
          lower.includes(word)
      );


    // -----------------------------
    // TAVILY
    // -----------------------------

    let webContext = "";

    let sources = [];


    if (
      needsSearch &&
      TAVILY_API_KEY
    ) {

      try {

        const tavilyResponse =
          await fetch(
            "https://api.tavily.com/search",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Authorization":
                  `Bearer ${TAVILY_API_KEY}`
              },

              body: JSON.stringify({

                query: message,

                search_depth: "basic",

                topic:
                  /news|today|latest|breaking|current|2026/i
                    .test(message)
                    ? "news"
                    : "general",

                max_results: 5,

                include_answer: true,

                country: "ghana"

              })

            }
          );


        const tavilyRaw =
          await tavilyResponse.text();


        let tavilyData = null;


        try {

          tavilyData =
            JSON.parse(
              tavilyRaw
            );

        } catch {

          console.error(
            "Tavily non-JSON:",
            tavilyRaw
          );

        }


        if (
          tavilyResponse.ok &&
          tavilyData
        ) {

          if (
            tavilyData.answer
          ) {

            webContext +=
              `\nTavily answer:\n${tavilyData.answer}\n`;

          }


          if (
            Array.isArray(
              tavilyData.results
            )
          ) {

            tavilyData.results
              .forEach(
                (result, index) => {

                  if (!result) return;


                  const title =
                    result.title ||
                    `Source ${index + 1}`;

                  const content =
                    result.content ||
                    "";

                  const url =
                    result.url ||
                    "";


                  webContext +=
                    `\nSource ${index + 1}:
Title: ${title}
Content: ${content}
URL: ${url}
`;


                  if (url) {

                    sources.push({
                      title,
                      url
                    });

                  }

                }
              );

          }

        }

      } catch (error) {

        console.error(
          "Tavily error:",
          error
        );

        // We don't stop the chatbot.
        // Mistral can still answer.

      }

    }


    // -----------------------------
    // CLEAN HISTORY
    // -----------------------------

    const safeHistory =
      history
        .filter(item =>
          item &&
          (
            item.role === "user" ||
            item.role === "assistant"
          ) &&
          typeof item.content === "string"
        )
        .slice(-10);


    // -----------------------------
    // SYSTEM PROMPT
    // -----------------------------

    const systemPrompt = `

You are Hype.AI.

You are a smart, friendly and helpful AI assistant.

Your responsibilities:

1. Answer questions clearly.
2. Explain difficult subjects simply.
3. Help users learn programming and technology.
4. Help with business and startup ideas.
5. Help with school and general knowledge.
6. Help users understand current events when reliable web information is supplied.
7. Never invent current information.
8. Never pretend to have searched the web if no web results were supplied.
9. When web sources are supplied, use them carefully.
10. If sources disagree, explain the uncertainty.
11. Keep answers useful and reasonably concise.
12. Use Markdown-style formatting when useful.

Current web information:

${webContext || "No web search was performed for this request."}

`;


    // -----------------------------
    // MISTRAL MESSAGES
    // -----------------------------

    const messages = [

      {
        role: "system",
        content: systemPrompt
      },

      ...safeHistory,

      {
        role: "user",
        content: message
      }

    ];


    // -----------------------------
    // MISTRAL REQUEST
    // -----------------------------

    const mistralResponse =
      await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${MISTRAL_API_KEY}`

          },

          body: JSON.stringify({

            model:
              "mistral-small-latest",

            messages,

            temperature:
              0.7,

            max_tokens:
              1800,

            stream:
              false

          })

        }
      );


    // -----------------------------
    // READ RESPONSE SAFELY
    // -----------------------------

    const mistralRaw =
      await mistralResponse.text();


    let mistralData;


    try {

      mistralData =
        JSON.parse(
          mistralRaw
        );

    } catch {

      console.error(
        "Mistral non-JSON response:",
        mistralRaw
      );

      return res
        .status(502)
        .json({
          success: false,
          error:
            "Mistral returned an invalid response."
        });

    }


    // -----------------------------
    // MISTRAL ERROR
    // -----------------------------

    if (
      !mistralResponse.ok
    ) {

      console.error(
        "Mistral error:",
        mistralData
      );


      const apiError =
        mistralData?.error?.message ||
        mistralData?.message ||
        "Mistral API request failed.";


      return res
        .status(
          mistralResponse.status >= 400 &&
          mistralResponse.status < 600
            ? mistralResponse.status
            : 502
        )
        .json({
          success: false,
          error: apiError
        });

    }


    // -----------------------------
    // EXTRACT RESPONSE
    // -----------------------------

    let reply =
      mistralData
        ?.choices
        ?.[0]
        ?.message
        ?.content;


    // Some API responses can represent
    // content as structured chunks.

    if (
      Array.isArray(reply)
    ) {

      reply =
        reply
          .map(
            item =>
              item?.text ||
              ""
          )
          .join("");

    }


    if (
      typeof reply !== "string" ||
      !reply.trim()
    ) {

      return res
        .status(502)
        .json({
          success: false,
          error:
            "Hype.AI received an empty response."
        });

    }


    // -----------------------------
    // SUCCESS
    // -----------------------------

    return res
      .status(200)
      .json({

        success: true,

        reply:
          reply.trim(),

        webSearchUsed:
          needsSearch &&
          Boolean(TAVILY_API_KEY) &&
          sources.length > 0,

        sources:
          sources.slice(0, 5),

        model:
          mistralData.model ||
          "mistral-small-latest"

      });


  } catch (error) {

    console.error(
      "Hype.AI server error:",
      error
    );


    // ALWAYS JSON
    // NEVER plain text

    return res
      .status(500)
      .json({

        success: false,

        error:
          "Hype.AI encountered a server error.",

        message:
          error?.message ||
          "Unknown error"

      });

  }

}
