import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export enum Emotion {
  NEUTRAL = "neutral",
  HAPPY = "happy",
  SAD = "sad",
  ANGRY = "angry",
  SURPRISED = "surprised",
  EMBARRASSED = "embarrassed",
}

export interface CharacterAction {
  characterName: string;
  text: string;
  narration: string;
  emotion: Emotion;
}

export interface ChatResponse {
  actions: CharacterAction[];
}

export async function chatWithCharacters(
  chatHistory: { role: "user" | "model"; parts: [{ text: string }] }[],
  message: string,
  charactersContext: string,
  userPersona: string = "a normal acquaintance"
): Promise<ChatResponse> {
  const systemInstruction = `You are a visual novel AI controlling multiple characters in a theater mode.
You are chatting with the user. You must respond to the user's prompts, keeping characters in character.

CHARACTERS IN SCENE:
${charactersContext}

The user's persona/relationship to the characters is: ${userPersona}.

IMPORTANT NARRATIVE RULES:
1. You can generate actions and dialogue for one or more characters in response to the user.
2. For each character acting or speaking, provide their name in "characterName".
3. Provide verbal dialogue in the "text" field. Leave empty if they only act.
4. Provide actions, environment descriptions, or inner thoughts in "narration". DO NOT put actions in the "text" field.
5. If the user uses asterisks like *walks closer*, treat that as their physical action.
6. You must pick an emotion that best matches each response from the following list: 
neutral, happy, sad, angry, surprised, embarrassed.`;

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actions: {
              type: Type.ARRAY,
              description: "A list of actions taken by the characters in response.",
              items: {
                type: Type.OBJECT,
                properties: {
                  characterName: {
                     type: Type.STRING,
                     description: "The name of the character."
                  },
                  text: {
                    type: Type.STRING,
                    description: "Verbal response to the user. Leave empty if only performing an action.",
                  },
                  narration: {
                    type: Type.STRING,
                    description: "Narrative description of actions, environment, or inner thoughts.",
                  },
                  emotion: {
                    type: Type.STRING,
                    description: "The emotion that matches the response.",
                    enum: [
                      "neutral",
                      "happy",
                      "sad",
                      "angry",
                      "surprised",
                      "embarrassed",
                    ],
                  },
                },
                required: ["characterName", "text", "narration", "emotion"],
              }
            }
          },
          required: ["actions"],
        },
      },
      history: chatHistory,
    });

    const response = await chat.sendMessage({ message });
    
    if (response.text) {
      return JSON.parse(response.text) as ChatResponse;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("GenAI Error:", error);
    throw error;
  }
}
