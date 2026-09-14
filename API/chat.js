export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error:"Method not allowed"
    });

  }


  try {

    const {
      message,
      history = [],
      memory = [],
      user = {}
    } = req.body;


    let webContext = "";


    /*
      TAVILY SEARCH
    */

    const needsSearch =
      /today|latest|current|now|news|recent|2026|price|weather/i
        .test(message);


    if (needsSearch) {

      const search =
        await fetch(
          "https://api.tavily.com/search",
          {

            method:"POST",

            headers:{
              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${process.env.TAVILY_API_KEY}`
            },

            body:JSON.stringify({

              query:message,

              max_results:5,

              search_depth:"basic"

            })

          }
        );


      if (search.ok) {

        const data =
          await search.json();

        webContext =
          (data.results || [])
            .map(
              x =>
                `${x.title}\n${x.content}\n${x.url}`
            )
            .join("\n\n");

      }

    }


    /*
      SYSTEM PROMPT
    */

    const system = `

You are Hype.AI.

You are a friendly, intelligent and helpful
AI assistant.

Current user:
${user.name || "User"}

Remember useful information from:
${memory.join("\n")}

Creator:
Gokah Israel Ewoenam,
Software & AI Engineer in Ghana.

If current web information is supplied,
use it carefully.

WEB INFORMATION:
${webContext}

Give accurate, useful and natural answers.

`;


    /*
      MISTRAL
    */

    const result =
      await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {

          method:"POST",

          headers:{

            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${process.env.MISTRAL_API_KEY}`

          },

          body:JSON.stringify({

            model:
              process.env.MISTRAL_MODEL ||
              "mistral-small-latest",

            messages:[
              {
                role:"system",
                content:system
              },

              ...history,

              {
                role:"user",
                content:message
              }
            ],

            temperature:.7,

            max_tokens:1500

          })

        }
      );


    if (!result.ok) {

      const error =
        await result.text();

      console.error(error);

      return res.status(500).json({
        error:"Mistral API failed."
      });

    }


    const data =
      await result.json();


    const answer =
      data.choices?.[0]?.message?.content;


    return res.status(200).json({

      answer:
        answer || "No response.",

      searchUsed:
        Boolean(webContext)

    });


  } catch(error) {

    console.error(error);

    return res.status(500).json({

      error:
        "Server error: " +
        error.message

    });

  }

}
