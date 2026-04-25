document.getElementById("btnResumer").addEventListener("click", async () => {
  // 1. Récupérer l'onglet actif
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 2. Lire le contenu de la page
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  });
  const text = result[0].result;

  // 3. Message d'attente
  document.getElementById("result").innerText = "Résumer en cours...";

  // 4. Appel API Groq
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.groqApiKey,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content:
              "Résume les points essentiels de ce texte en français :\n\n" +
              text.substring(0, 5000),
          },
        ],
      }),
    },
  );

  // 5. Traiter la réponse
  const data = await response.json();
  const resume = data.choices[0].message.content;

  // 6. Afficher le résumé
  document.getElementById("result").innerText = resume;
});
