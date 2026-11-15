import { GoogleGenAI } from "@google/genai";
import type { CategorieCandidate, ClassificateurIA, ResultatClassification } from "@ports/classificateur-ia.port.ts";

export const VERSION_MODELE = "gemini-4-hydrogen";

/**
 * Classificateur réel.
 *
 * Le prompt liste les catégories **issues du référentiel** : ajouter une catégorie ne demande
 * aucune modification de code. La réponse est validée avant d''être acceptée ; une réponse
 * incohérente lève, le worker réessaiera puis abandonnera proprement.
 */
export function creerClassificateurGemini(cle: string, modele: string = VERSION_MODELE): ClassificateurIA {
  const client = new GoogleGenAI({ apiKey: cle });

  return {
    async classifier(photo, mime, candidates) {
      if (candidates.length === 0) {
        throw new Error("aucune catégorie candidate");
      }

      const liste = candidates.map((c) => `${c.idCategorie} = ${c.nom}`).join(" ; ");
      const prompt = [
        "Tu analyses une photo de déchets urbains à Lomé (Togo).",
        "Réponds en JSON strict :",
        '{"id_categorie": "...", "score_confiance": 0.0, "justification": "une phrase"}',
        `Catégories autorisées : ${liste}.`,
        "score_confiance est un nombre entre 0 et 1.",
      ].join("\n");

      const reponse = await client.models.generateContent({
        model: modele,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: mime, data: photo.toString("base64") } }, { text: prompt }],
          },
        ],
        config: { responseMimeType: "application/json", temperature: 0 },
      });

      const texte = reponse.text ?? "";
      const brut = JSON.parse(texte) as { id_categorie?: unknown; score_confiance?: unknown; justification?: unknown };
      const candidate = candidates.find((c) => c.idCategorie === brut.id_categorie);
      const score = typeof brut.score_confiance === "number" ? brut.score_confiance : Number.NaN;

      if (!candidate || !Number.isFinite(score) || score < 0 || score > 1) {
        throw new Error(`réponse IA inexploitable : ${texte.slice(0, 120)}`);
      }

      const resultat: ResultatClassification = {
        idCategorie: candidate.idCategorie,
        nomCategorie: candidate.nom,
        score,
        justification: typeof brut.justification === "string" ? brut.justification.slice(0, 300) : "",
        mode: "MODELE",
        modeleVersion: modele,
      };
      return resultat;
    },
  };
}