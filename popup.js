//  déclaration de la fonction avec prompt comme paramètre
async function analyserPage(prompt) {
  //  récupérer l'onglet actif — trouver sur quel onglet l'utilisateur est en ce moment
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // récupérer le contenu texte de la page
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  });
  const text = result[0].result;

  // message d'attente affiché pendant que l'API travaille
  document.getElementById("result").innerText = "Analyse en cours...";

  // appel à l'API Groq via fetch
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.groqApiKey,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1024,
        messages: [
          { role: "user", content: prompt + "\n\n" + text.substring(0, 5000) },
        ],
      }),
    },
  );

  const data = await response.json(); // convertir la réponse en objet JS lisible
  const resume = data.choices[0].message.content; // extraire le texte du résumé
  document.getElementById("result").innerText = resume; // afficher le résumé dans le popup
} // ← fermeture de analyserPage

// écouter le clic sur le bouton et lancer la fonction
document.getElementById("btnResumer").addEventListener("click", () => {
  analyserPage("Résume les points essentiels de ce texte en français :");
});

document.getElementById("btnExpliquer").addEventListener("click", () => {
  analyserPage(
    "Explique ce texte en français de manière pédagogique, comme si tu l'expliquais à un débutant :",
  );
});
