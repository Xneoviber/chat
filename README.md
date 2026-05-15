# Visual Novel AI Chat 🎭

A fully interactive, AI-powered Visual Novel Chat application built with React, Vite, and Tailwind CSS. Chat with dynamic AI characters who respond to your dialogue and actions, complete with emotional state tracking and visual avatar changes.

## ✨ Features

### 1. Theater Mode (Multi-Character Support)
Add and manage multiple AI characters simultaneously. The AI can dynamically control various characters in the scene, complete with their own unique personalities and names. 

### 2. Dialogue & Narration Interaction
Interact using two distinct modes:
*   **💬 Say (Dialogue):** Speak directly to the characters.
*   **🎬 Act (Narration):** Describe your physical actions, environment, or inner thoughts (e.g., `*walks closer and sighs*`). 

### 3. Emotion-Based Avatars
The AI intelligently determines the emotional state (neutral, happy, sad, angry, surprised, embarrassed) of the responding character. The UI dynamically changes the character's avatar to match their current emotion.

### 4. Edit & Delete Messages
*   **Edit:** Hover over any message (yours or the AI's) to rewrite history. Correct a typo, change your action, or tweak the AI's response to steer the story.
*   **Delete:** Remove messages from the timeline entirely if you want to backtrack. 

### 5. Local Save & Load System
*   **💾 Export Chat:** Download your entire chat history, including the characters context, custom personas, and emotional states as a `.json` file.
*   **📂 Import Chat:** Upload your saved `.json` file to instantly resume your story right where you left off.

### 6. Dynamic Personas
Choose from pre-defined personality tropes (like *Tsundere*, *Kuudere*, *Yandere*) or describe completely custom personalities for the characters. You can also define your own role in the story (e.g., childhood friend, stranger, rival).

## 🚀 How to Play

1.  **Customize Characters:** Click the **Settings (⚙️)** icon in the top right to open the Persona Settings. Here you can add new characters to the "Theater", assign them templates, or write custom backgrounds. You can also assign yourself a specific role.
2.  **Upload Custom Avatars:** For a truly custom visual novel experience, you can place your own images in the `public` folder of your project root. Name them according to the emotions: `neutral.png`, `happy.png`, `sad.png`, `angry.png`, `surprised.png`, and `embarrassed.png`.
3.  **Start Chatting:** Use the **Say** and **Act** toggles above the text input to communicate or perform actions.
4.  **Save Your Progress:** Click the **Download (🔽)** icon in the top navigation bar to save your current chat.

## 🛠️ Tech Stack

*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS
*   **Animations:** Motion (Framer Motion)
*   **Icons:** Lucide React
*   **AI Integration:** `@google/genai` (Google Gemini API using structured JSON schema output)

## 💻 Making Changes

If you'd like to extend the app, here's a quick overview of the architecture:
*   `src/App.tsx`: Main UI shell, chat rendering, state management (Save/Load, Personas).
*   `src/services/geminiService.ts`: AI prompt construction, interaction with the Gemini API, and JSON schema enforcement for character actions, text, and emotion outputs.
*   `src/constants/templates.ts`: Pre-defined character and user persona templates.
