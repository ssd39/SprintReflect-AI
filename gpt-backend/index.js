require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const getGptResponse = async (prompt) => {
  const gptResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    }
  );
  const resonseJson = await gptResponse.json();
  if (resonseJson?.choices) {
    const message = resonseJson.choices[0].message.content.trim();
    return message;
  }
  return "";
};

app.post("/gpt", (req, res) => {
  const data = req.body;
  if (data.actionId == 0) {
    (async (data_) => {
      const prompt = data_.prompt;
      
      const message = await getGptResponse(prompt);
      const questions = JSON.parse(message).survey.questions;

      fetch(data_.webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions, ...data_ }),
      });
    })(data);
  } else if (data.actionId == 1) {
    (async (data_) => {
      
      const prompt = data_.prompt;
      const message = await getGptResponse(prompt);
      const retro = JSON.parse(message);
      fetch(data_.webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ retro, ...data_ }),
      });
    })(data);
  } else if (data.actionId == 2) {
    (async (data_) => {
      
      const prompt = data_.prompt;
      const message = await getGptResponse(prompt);
      const retro = JSON.parse(message);

      fetch(data_.webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sprintRetro: retro, ...data_ }),
      });
    })(data);
  }
  return res.json({});
});



app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
