import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, Settings2, X, Trash2, Download, Upload, HelpCircle, Edit2, Check } from 'lucide-react';
import { chatWithCharacters, Emotion, ChatResponse } from './services/geminiService';
import { CHARACTER_TEMPLATES, USER_TEMPLATES } from './constants/templates';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  narration?: string;
  emotion?: Emotion;
}

const AVATAR_FALLBACKS: Record<Emotion, string> = {
  [Emotion.NEUTRAL]: "https://placehold.co/400x600/e2e8f0/475569?text=Neutral",
  [Emotion.HAPPY]: "https://placehold.co/400x600/fef08a/854d0e?text=Happy",
  [Emotion.SAD]: "https://placehold.co/400x600/bfdbfe/1e3a8a?text=Sad",
  [Emotion.ANGRY]: "https://placehold.co/400x600/fecaca/991b1b?text=Angry",
  [Emotion.SURPRISED]: "https://placehold.co/400x600/fed7aa/9a3412?text=Surprised",
  [Emotion.EMBARRASSED]: "https://placehold.co/400x600/fbcfe8/be185d?text=Embarrassed",
};

export interface StoryCharacter {
  id: string;
  name: string;
  template: string;
  customPersona: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "model",
      text: "H-hmph! It's not like I wanted to chat with you or anything, but since you're here, I guess I've got some time...",
      narration: "She looks away, crossing her arms defensively.",
      emotion: Emotion.EMBARRASSED,
      characterName: "Haruka"
    }
  ]);
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<'dialogue' | 'narration'>('dialogue');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(Emotion.EMBARRASSED);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const [characters, setCharacters] = useState<StoryCharacter[]>([
    { id: '1', name: 'Haruka', template: 'tsundere', customPersona: '' }
  ]);
  
  const [userTemplate, setUserTemplate] = useState('friend');
  const [customUserPersona, setCustomUserPersona] = useState('');

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ text: '', narration: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const addCharacter = () => {
    setCharacters([...characters, {
      id: Date.now().toString(),
      name: `Char ${characters.length + 1}`,
      template: 'tsundere',
      customPersona: ''
    }]);
  };

  const removeCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
  };

  const updateCharacter = (id: string, updates: Partial<StoryCharacter>) => {
    setCharacters(characters.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditDraft({ text: msg.text || '', narration: msg.narration || '' });
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
  };

  const saveEdit = () => {
    if (editingMessageId) {
      setMessages(msgs => msgs.map(m => m.id === editingMessageId ? { ...m, text: editDraft.text.trim(), narration: editDraft.narration.trim() } : m));
      setEditingMessageId(null);
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(msgs => msgs.filter(m => m.id !== id));
    if (editingMessageId === id) setEditingMessageId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: '' };
    if (inputMode === 'narration') {
      userMsg.narration = input;
    } else {
      userMsg.text = input;
    }

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const charactersContext = characters.map(c => {
      const desc = c.template === 'custom' 
        ? c.customPersona 
        : CHARACTER_TEMPLATES.find(t => t.id === c.template)?.desc || '';
      return `${c.name}: ${desc}`;
    }).join('\n\n');
      
    const activeUserPersona = userTemplate === 'custom'
      ? customUserPersona
      : USER_TEMPLATES.find(t => t.id === userTemplate)?.desc || '';

    try {
      // Convert state messages to API format
      const history = messages.map(msg => {
        let content = '';
        if (msg.narration) content += `*${msg.narration}*\n`;
        if (msg.text) content += msg.text;
        
        return {
          role: msg.role,
          parts: [{ text: content.trim() }] as [{ text: string }]
        }
      });

      const response = await chatWithCharacters(
        history, 
        userMsg.narration ? `*${userMsg.narration}*` : userMsg.text, 
        charactersContext,
        activeUserPersona
      );
      
      const newAiMessages = (response.actions || []).map((action, idx) => ({
        id: (Date.now() + idx + 1).toString(),
        role: 'model' as const,
        text: action.text,
        narration: action.narration,
        emotion: action.emotion,
        characterName: action.characterName
      }));
      
      if (newAiMessages.length > 0) {
        setCurrentEmotion(newAiMessages[newAiMessages.length - 1].emotion || Emotion.EMBARRASSED);
        setMessages(prev => [...prev, ...newAiMessages]);
      } else {
        throw new Error("No characters responded.");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "*sigh* I couldn't understand that... something went wrong with the connection. (Please check your API key in the AI Studio Settings > Secrets panel.)",
        emotion: Emotion.SAD
      };
      setCurrentEmotion(Emotion.SAD);
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const emotionsTransition = {
    [Emotion.NEUTRAL]: { y: 0, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 100 } },
    [Emotion.HAPPY]: { y: [0, -20, 0, -20, 0], scale: 1.05, rotate: 0, transition: { duration: 0.6 } },
    [Emotion.SAD]: { y: 20, scale: 0.95, rotate: 0, transition: { duration: 0.5, type: "spring" } },
    [Emotion.ANGRY]: { x: [-10, 10, -10, 10, 0], scale: 1.05, rotate: 0, transition: { duration: 0.4 } },
    [Emotion.SURPRISED]: { y: -30, scale: 1.1, rotate: 0, transition: { type: "spring", stiffness: 300 } },
    [Emotion.EMBARRASSED]: { rotate: [0, -5, 5, -2, 0], scale: 0.95, y: 10, transition: { duration: 0.5 } }
  };

  // Use a constant cachebuster so it doesn't cause infinite re-renders but bypasses previous 404s
  const CACHEBUSTER = "?t=1";

  const getAvatarUrl = (emotion: Emotion) => {
    return `/${emotion}.png${CACHEBUSTER}`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, emotion: Emotion) => {
    // If local image fails to load for some reason, we can set a fallback, but we'll only do it once.
    if (e.currentTarget.src !== AVATAR_FALLBACKS[emotion]) {
      e.currentTarget.src = AVATAR_FALLBACKS[emotion];
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: "model",
        text: "H-hmph! It's not like I wanted to chat with you or anything, but since you're here, I guess I've got some time...",
        narration: "She looks away, crossing her arms defensively.",
        emotion: Emotion.EMBARRASSED,
        characterName: "Haruka"
      }
    ]);
    setCurrentEmotion(Emotion.EMBARRASSED);
  };

  const handleExport = () => {
    const data = {
      messages,
      currentEmotion,
      characters,
      userTemplate,
      customUserPersona
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          setCurrentEmotion(data.currentEmotion || Emotion.EMBARRASSED);
          if (data.characters) setCharacters(data.characters);
          else if (data.characterTemplate) {
             setCharacters([{
               id: '1', name: 'Haruka', template: data.characterTemplate, customPersona: data.customCharacterPersona || ''
             }]);
          }
          if (data.userTemplate) setUserTemplate(data.userTemplate);
          if (data.customUserPersona !== undefined) setCustomUserPersona(data.customUserPersona);
        }
      } catch (error) {
        console.error("Error importing file:", error);
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-950 overflow-hidden font-sans">
      {/* Background with slight blur if we had a bg image. Using a subtle gradient for now. */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 opacity-80 z-0"></div>

      {/* Main Layout */}
      <div className="relative z-10 flex w-full max-w-7xl mx-auto h-full text-slate-100 flex-col md:flex-row">
        
        {/* Top/Left Side - Visual Novel Avatar Display */}
        <div className="relative flex-1 flex flex-col items-center justify-end px-4 z-0 pointer-events-none mt-8 md:mt-0 md:pb-4 overflow-hidden">
          <div className="absolute top-4 left-4 z-20 text-xs text-white/40 bg-black/40 p-2 rounded max-w-xs backdrop-blur-sm hidden md:block pointer-events-auto">
            <p className="font-bold text-white/70 mb-1">Upload Avatars (Optional)</p>
            <p>To use custom images, add files named <code>neutral.png</code>, <code>happy.png</code>, etc. to your public folder.</p>
          </div>
          
          <div className="relative w-full max-w-md h-full flex items-end justify-center pointer-events-none">
            <AnimatePresence>
              <motion.div
                key={currentEmotion}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1, 
                  ...emotionsTransition[currentEmotion]
                }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="absolute origin-bottom flex items-end justify-center w-full h-full"
              >
                <img 
                  src={getAvatarUrl(currentEmotion)} 
                  onError={(e) => handleImageError(e, currentEmotion)}
                  alt={`Avatar showing ${currentEmotion}`}
                  className="max-h-full object-contain drop-shadow-2xl"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom/Right Side - Chat Interface */}
        <div className="w-full h-[55vh] md:h-full md:w-[450px] lg:w-[500px] flex flex-col border-t md:border-t-0 md:border-l border-white/10 bg-black/60 md:bg-black/40 backdrop-blur-xl relative z-10 shadow-[0_-20px_40px_rgba(0,0,0,0.5)] md:shadow-none shrink-0">

          {/* Interactive Chat Region */}
          <div className="flex flex-col h-full bg-transparent">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30 md:bg-transparent">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Haruka</h1>
                <p className="text-xs text-indigo-300 font-medium tracking-wide uppercase">Visual Novel AI Chat</p>
              </div>
              <div className="flex gap-2 md:gap-4 items-center">
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  title="Help & Info"
                  className={`p-1.5 rounded-full transition-colors ${showHelp ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                >
                  <HelpCircle className="w-5 h-5 md:w-5 md:h-5" />
                </button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  onChange={handleImport} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  title="Import Chat"
                  className="p-1.5 rounded-full transition-colors text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Upload className="w-5 h-5 md:w-5 md:h-5" />
                </button>
                <button 
                  onClick={handleExport}
                  title="Export Chat"
                  className="p-1.5 rounded-full transition-colors text-white/50 hover:text-white hover:bg-white/10"
                >
                  <Download className="w-5 h-5 md:w-5 md:h-5" />
                </button>
                <button 
                  onClick={handleClearHistory}
                  title="Clear Chat History"
                  className="p-1.5 rounded-full transition-colors text-white/50 hover:text-white hover:bg-white/10 hover:text-red-400"
                >
                  <Trash2 className="w-5 h-5 md:w-5 md:h-5" />
                </button>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-full transition-colors ${showSettings ? 'bg-indigo-500/20 text-indigo-300' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                >
                  <Settings2 className="w-5 h-5 md:w-5 md:h-5" />
                </button>
                {/* Emotion Indicator dot */}
                <div title={currentEmotion} className="w-3 h-3 rounded-full bg-white ml-2" style={{
                  backgroundColor: 
                    currentEmotion === 'angry' ? '#ef4444' : 
                    currentEmotion === 'happy' ? '#eab308' : 
                    currentEmotion === 'sad' ? '#3b82f6' : 
                    currentEmotion === 'embarrassed' ? '#ec4899' :
                    currentEmotion === 'surprised' ? '#f97316' : '#94a3b8'
                }}></div>
              </div>
            </div>

            {/* Help Panel */}
            <AnimatePresence>
              {showHelp && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 right-4 left-4 md:left-auto md:w-80 z-50 bg-slate-900/95 border border-white/10 p-5 rounded-xl shadow-2xl backdrop-blur-xl overflow-y-auto max-h-[60vh] md:max-h-[70vh]"
                >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">How to Play</h3>
                  <button onClick={() => setShowHelp(false)} className="text-white/50 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-xs text-white/80 space-y-4">
                  <div>
                    <h4 className="font-bold text-indigo-300 mb-1">💬 Dialogue vs 🎬 Action</h4>
                    <p>Use the buttons near the chat input to switch between talking directly or narrating an action.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-pink-300 mb-1">🎭 Personas & Theater</h4>
                    <p>Click the Settings icon to change character personalities, add multiple characters, and update your own role.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-300 mb-1">✏️ Edit & Delete</h4>
                    <p>Hover over a message to reveal edit and delete buttons. You can correct typos or change responses.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-300 mb-1">💾 Save / Load</h4>
                    <p>Use the Upload/Download buttons in the header to save your chat history and continue later.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-300 mb-1">💅 Custom Avatars</h4>
                    <p>Place images named <code>neutral.png</code>, <code>happy.png</code>, <code>sad.png</code>, <code>angry.png</code>, <code>surprised.png</code>, and <code>embarrassed.png</code> in the <code>public</code> folder.</p>
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 right-4 left-4 md:left-auto md:w-80 z-50 bg-slate-900/95 border border-white/10 p-5 rounded-xl shadow-2xl backdrop-blur-xl overflow-y-auto max-h-[40vh] md:max-h-[70vh]"
                >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">Persona Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="text-white/50 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-[10px] text-white/50 mb-4 block">
                  Changes apply to your next message.
                </p>

                {/* Character Persona Section */}
                <div className="mb-5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-indigo-300">Theater Characters</label>
                    <button 
                      onClick={addCharacter}
                      className="text-[10px] bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 px-2 py-1 rounded transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  
                  {characters.map((c, i) => (
                    <div key={c.id} className="bg-white/5 border border-white/10 p-3 rounded-lg relative">
                      {characters.length > 1 && (
                        <button 
                          onClick={() => removeCharacter(c.id)}
                          className="absolute top-2 right-2 text-white/30 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <input 
                        type="text"
                        value={c.name}
                        onChange={e => updateCharacter(c.id, { name: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-xs font-bold rounded p-1.5 mb-2 focus:outline-none focus:border-indigo-500"
                        placeholder="Character Name"
                      />
                      <select 
                        value={c.template}
                        onChange={(e) => updateCharacter(c.id, { template: e.target.value })}
                        className="w-full bg-black/50 border border-white/10 text-white text-xs rounded p-1.5 mb-2 focus:outline-none focus:border-indigo-500"
                      >
                        {CHARACTER_TEMPLATES.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      
                      {c.template === 'custom' ? (
                        <textarea 
                          value={c.customPersona}
                          onChange={e => updateCharacter(c.id, { customPersona: e.target.value })}
                          className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16"
                          placeholder="Describe personality..."
                        />
                      ) : (
                        <div className="text-[10px] text-white/60 bg-black/30 p-2 rounded border border-white/5">
                          {CHARACTER_TEMPLATES.find(t => t.id === c.template)?.desc}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* User Persona Section */}
                <div>
                  <label className="text-xs font-semibold text-pink-300 block mb-2">Your Persona</label>
                  <select 
                    value={userTemplate}
                    onChange={(e) => setUserTemplate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white text-sm rounded-lg p-2 mb-2 focus:outline-none focus:border-pink-500"
                  >
                    {USER_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  
                  {userTemplate === 'custom' ? (
                    <textarea 
                      value={customUserPersona}
                      onChange={e => setCustomUserPersona(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-pink-500 resize-none h-20"
                      placeholder="Describe your role/personality..."
                    />
                  ) : (
                    <div className="text-xs text-white/60 bg-black/30 p-2 rounded border border-white/5">
                      {USER_TEMPLATES.find(t => t.id === userTemplate)?.desc}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0 [scrollbar-width:thin]">
            {messages.map((msg) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`max-w-[85%] group relative flex flex-col ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div 
                  className={`p-3 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white/10 text-slate-100 rounded-tl-sm border border-white/5 shadow-xl'
                  } ${editingMessageId === msg.id ? 'w-full md:w-80 border-indigo-500' : ''}`}
                >
                  {editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2">
                       {msg.role === 'model' && (
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-xs font-bold text-white/90">
                             {msg.characterName || 'Haruka'}
                           </span>
                           <span className="text-[10px] text-indigo-300">Editing...</span>
                         </div>
                       )}
                       <textarea 
                        value={editDraft.narration}
                        onChange={(e) => setEditDraft(prev => ({ ...prev, narration: e.target.value }))}
                        className="w-full bg-black/40 border border-white/20 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-400 italic"
                        placeholder="Narration..."
                        rows={2}
                       />
                       <textarea 
                        value={editDraft.text}
                        onChange={(e) => setEditDraft(prev => ({ ...prev, text: e.target.value }))}
                        className="w-full bg-black/40 border border-white/20 rounded p-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                        placeholder="Dialogue..."
                        rows={3}
                       />
                       <div className="flex justify-end gap-2 mt-1">
                          <button onClick={cancelEdit} className="p-1.5 text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded">
                            <X className="w-4 h-4" />
                          </button>
                          <button onClick={saveEdit} className="p-1.5 text-white/90 hover:text-white bg-indigo-500/80 hover:bg-indigo-500 rounded">
                            <Check className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  ) : (
                    <>
                      {msg.role === 'model' && (
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <span className="text-xs font-bold text-white/90">
                            {msg.characterName || 'Haruka'}
                          </span>
                          {msg.emotion && (
                            <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold">
                              {msg.emotion}
                            </span>
                          )}
                        </div>
                      )}
                      {msg.narration && (
                        <p className={`text-sm italic mb-1 opacity-80 ${msg.role === 'model' ? 'border-l-2 border-indigo-400 pl-2 text-slate-300' : 'text-indigo-100'}`}>
                          *{msg.narration}*
                        </p>
                      )}
                      {msg.text && (
                        <p className="leading-relaxed text-sm md:text-base whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </>
                  )}
                </div>
                {/* Action Buttons */}
                <div className={`flex items-center gap-2 mt-1 md:absolute md:top-0 md:-mt-2 md:mt-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity md:bg-slate-900 md:border md:border-white/10 md:p-1 md:rounded-lg md:backdrop-blur-md z-10 ${
                  msg.role === 'user' ? 'justify-end md:-left-16' : 'justify-start md:-right-16'
                }`}>
                  <button 
                    onClick={() => startEditing(msg)}
                    className="p-1 px-2 md:p-1.5 text-white/50 hover:text-indigo-400 hover:bg-white/10 rounded-md transition-colors flex items-center gap-1"
                    title="Edit message"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> <span className="text-[10px] md:hidden">Edit</span>
                  </button>
                  <button 
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1 px-2 md:p-1.5 text-white/50 hover:text-red-400 hover:bg-white/10 rounded-md transition-colors flex items-center gap-1"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> <span className="text-[10px] md:hidden">Delete</span>
                  </button>
                </div>
              </motion.div>
            ))}
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mr-auto max-w-[85%]"
              >
                <div className="px-4 py-3 rounded-2xl bg-white/5 rounded-tl-sm border border-white/5 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-sm text-slate-400 italic">Haruka is thinking...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-black/40 md:bg-black/20 border-t border-white/10 shrink-0 mb-safe pointer-events-auto">
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setInputMode('dialogue')} 
                className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full transition-colors ${inputMode === 'dialogue' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
              >
                💬 Say
              </button>
              <button 
                onClick={() => setInputMode('narration')} 
                className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full transition-colors ${inputMode === 'narration' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
              >
                🎬 Act
              </button>
            </div>
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Say something to her..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent text-white resize-none min-h-[44px] max-h-[120px] text-[16px] md:text-sm"
                rows={1}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-[44px] w-[44px] md:h-auto md:w-auto md:p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl transition-colors shadow-lg disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center pointer-events-auto"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="hidden md:flex text-center text-[10px] text-white/30 mt-3 items-center justify-center gap-1">
              Press <kbd className="font-mono bg-white/10 px-1 rounded">Enter</kbd> to send
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
