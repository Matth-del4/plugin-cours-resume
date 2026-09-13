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

  // élément où on affiche le résumé, on le vide avant de commencer
  const resultEl = document.getElementById("result");
  resultEl.innerText = "";

  try {
    // appel à l'API Groq via fetch, avec stream: true pour recevoir la réponse morceau par morceau
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + config.groqApiKey,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b", // rapide et adapté au résumé de texte
          max_tokens: 1024,
          stream: true, // active le streaming de la réponse
          messages: [
            {
              role: "user",
              content: prompt + "\n\n" + text.substring(0, 5000),
            },
          ],
        }),
      },
    );

    // si Groq renvoie une erreur (clé API invalide, mauvais nom de modèle, quota dépassé...),
    // response.ok vaut false et il n'y a pas de flux à lire : on l'affiche et on s'arrête là
    if (!response.ok) {
      const errorText = await response.text();
      resultEl.innerText = "Erreur API Groq : " + errorText;
      console.error("Erreur API Groq :", errorText);
      return;
    }

    // lecteur du flux de réponse (la réponse arrive en plusieurs morceaux, pas en un bloc)
    const reader = response.body.getReader();
    const decoder = new TextDecoder(); // convertit les octets reçus en texte
    let buffer = ""; // stocke les données reçues en attendant une ligne complète

    // boucle qui lit le flux jusqu'à ce qu'il soit terminé
    while (true) {
      const { done, value } = await reader.read();
      if (done) break; // plus rien à lire, on sort de la boucle

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n"); // Groq envoie les données ligne par ligne
      buffer = lines.pop(); // on garde la dernière ligne (potentiellement incomplète) pour la suite

      // on traite chaque ligne complète reçue
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue; // on ignore les lignes qui ne contiennent pas de données
        const payload = line.slice(6); // on enlève le préfixe "data: "
        if (payload === "[DONE]") continue; // signal de fin de flux envoyé par Groq

        const json = JSON.parse(payload); // on convertit le morceau reçu en objet JS
        if (!json.choices || !json.choices[0]) continue; // ignore les morceaux sans contenu utilisable
        const delta = json.choices[0]?.delta?.content || ""; // le petit bout de texte généré
        resultEl.innerText += delta; // on l'ajoute au fur et à mesure à l'affichage
      }
    }
  } catch (err) {
    // en cas d'erreur réseau ou d'API, on prévient l'utilisateur au lieu de planter en silence
    resultEl.innerText = "Erreur : impossible d'obtenir le résumé.";
    console.error(err);
  }
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
