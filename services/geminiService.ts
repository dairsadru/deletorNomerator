import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeCleanupCandidates = async (
  inactiveContacts: string[]
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Limit processing to first 100 names to save tokens/time, or process in chunks in a real prod app
    const sample = inactiveContacts.slice(0, 100).join(", ");
    
    const prompt = `
      Я планирую удалить контакты из телефона, которые не смотрят мои статусы в WhatsApp.
      Вот список кандидатов на удаление:
      [${sample}]
      
      Пожалуйста, проанализируй этот список (по именам/названиям):
      1. Есть ли здесь явные бизнес-аккаунты, сервисы или важные службы (врачи, доставка, банки), которые опасно удалять?
      2. Есть ли имена, похожие на близких родственников (Мама, Папа и т.д.)?
      3. Дай краткий совет по стратегии удаления для этого списка.
      
      Отвечай на русском языке. Будь краток и структурирован.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Не удалось провести анализ.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Ошибка анализа. Проверьте API ключ.";
  }
};