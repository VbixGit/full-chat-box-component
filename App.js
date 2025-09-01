import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Trash2, Bot, User, Moon, Sun } from "lucide-react";
import { body, header } from "framer-motion/client";

// Utility helpers
const fmtTime = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const uid = () => Math.random().toString(36).slice(2, 10);
let keepMM = [];

// Chat bubble component
function Bubble({ msg, isOwn, avatar, name, theme }) {
  const isDark = theme === "dark";
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isDark ? "bg-slate-700" : "bg-slate-200"}`}>
          {avatar ? (
            <img src={avatar} alt={name || "avatar"} className="w-full h-full object-cover" />
          ) : (
            <Bot className={`w-4 h-4 ${isDark ? "text-slate-300" : "text-slate-600"}`} />
          )}
        </div>
      )}

      <div
        className={`max-w-[85%] break-words overflow-hidden rounded-2xl px-4 py-2 shadow-sm ${
          isOwn
            ? "bg-blue-600 text-white rounded-br-sm"
            : isDark
            ? "bg-slate-800 text-slate-100 border border-slate-600 rounded-bl-sm"
            : "bg-white text-slate-900 border border-slate-200 rounded-bl-sm"
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed break-words"><p>{msg.content}</p></div>
        <div
          className={`text-[10px] mt-1 flex items-center gap-1 ${
            isOwn ? "text-blue-100" : isDark ? "text-slate-400" : "text-slate-400"
          }`}
        >
          <span>{fmtTime(msg.timestamp)}</span>
          {msg.status === "sending" && <span>• sending…</span>}
          {msg.status === "error" && <span className="text-red-500">• failed</span>}
        </div>
      </div>

      {isOwn && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isDark ? "bg-blue-900" : "bg-blue-100"}`}>
          {avatar ? (
            <img src={avatar} alt={name || "avatar"} className="w-full h-full object-cover" />
          ) : (
            <User className={`w-4 h-4 ${isDark ? "text-blue-300" : "text-blue-700"}`} />
          )}
        </div>
      )}
    </div>
  );
}

// Typing indicator
function TypingDots({ theme }) {
  const dot = {
    initial: { opacity: 0.3, y: 0 },
    animate: { opacity: 1, y: -2 },
    transition: {
      repeat: Infinity,
      repeatType: "reverse",
      duration: 0.6,
    },
  };
  return (
    <div
      className={`inline-flex gap-1 px-3 py-2 rounded-xl shadow-sm ${
        theme === "dark" ? "bg-slate-800 border border-slate-600 text-slate-300" : "bg-white border border-slate-200 text-slate-500"
      }`}
    >
      <motion.span {...dot} transition={{ ...dot.transition, delay: 0 }}>•</motion.span>
      <motion.span {...dot} transition={{ ...dot.transition, delay: 0.15 }}>•</motion.span>
      <motion.span {...dot} transition={{ ...dot.transition, delay: 0.3 }}>•</motion.span>
    </div>
  );
}




async function sendToChatGPT(keepMM) {
  const apiKey = '{Input you api key}'
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // หรือ gpt-3.5-turbo
      messages: keepMM,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response";
}



async function sendToGemini(message) {
  const response = await fetch("https://geminiapi.googleapis.com/v1beta/responses:generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REACT_APP_GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: message,
      model: "gemini-1", // ระบุโมเดล Gemini
      maxOutputTokens: 256
    }),
  });

  const data = await response.json();
  return data.candidates?.[0]?.content || "No response";
}




// Main ChatBox
export function ChatBox({
  title = "AI Chat",
  placeholder = "Type a message…",
  initialMessages = [
    { id: uid(), role: "assistant", content: "Hi! How can I help today?", timestamp: Date.now() },
  ],
  onSend,
  botName = "Assistant",
  userName = "You",
  botAvatarUrl,
  userAvatarUrl,
  height = "calc(98vh - 2rem)", // nearly full screen height
  className = "",
}) {
  const [messages, setMessages] = useState(() => initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState("light");

  const containerRef = useRef(null);
  const listEndRef = useRef(null);

  const containerStyle = useMemo(
    () => ({ height: typeof height === "number" ? `${height}px` : height }),
    [height]
  );

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: Date.now(),
      status: "sent",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (!onSend) return;

    setBusy(true);
    setIsTyping(true);
    try {
      const result = await onSend(userMsg);
      const assistantMsg =
        typeof result === "string"
          ? { id: uid(), role: "assistant", content: result, timestamp: Date.now(), status: "sent" }
          : result && typeof result === "object"
          ? {
              id: result.id || uid(),
              role: result.role || "assistant",
              content: result.content,
              timestamp: result.timestamp || Date.now(),
              status: result.status || "sent",
            }
          : { id: uid(), role: "assistant", content: "", timestamp: Date.now(), status: "sent" };

      setMessages((prev) => [...prev, assistantMsg]);


    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          content: "Sorry, something went wrong.",
          timestamp: Date.now(),
          status: "error",
        },
      ]);


      console.error(e);
    } finally {
      setIsTyping(false);
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([])
    keepMM = [];
  };

  return (
    <div className={`w-full h-full mx-auto ${theme === "dark" ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"} ${className}`}>
      <div className={`flex items-center justify-between px-4 py-3 border rounded-t-2xl shadow-sm ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <div className="font-semibold">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 text-lg"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} {theme === "light" ? "Dark" : "Light"}
          </button>
          <button
            onClick={clearChat}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 text-lg"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`border-x border-b rounded-b-2xl overflow-hidden ${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}
        style={containerStyle}
      >
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Bubble
                    msg={m}
                    isOwn={m.role === "user"}
                    avatar={m.role === "user" ? userAvatarUrl : botAvatarUrl}
                    name={m.role === "user" ? userName : botName}
                    theme={theme}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <div className="flex justify-start">
                <TypingDots theme={theme} />
              </div>
            )}
            <div ref={listEndRef} />
          </div>

          <div className={`border-t p-3 ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  className={`w-full resize-y min-h-[43px] max-h-60 rounded-2xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${theme === "dark" ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
                  placeholder={placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Chat input"
                />
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || busy}
                className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo wrapper
export default function ChatDemo() {
  const fakeAI = async (userMsg) => {
      try {
        // รอเรียก ChatGPT API
        keepMM.push({role: "user", content: userMsg.content}); // จดจำคำถาม
        const message = await sendToChatGPT(keepMM);
        keepMM.push({role: "assistant", content: message}); // จดจำคำตอบ

        // console.log(keepMM);

        let modifyMessage = message.replaceAll("**", "*")
        return {
          id: uid(),
          role: "assistant",
          content: modifyMessage,
          timestamp: Date.now(),
          status: "sent",
        };
      } catch (error) {
        console.error(error);
        return {
          id: uid(),
          role: "assistant",
          content: "Sorry, something went wrong.",
          timestamp: Date.now(),
          status: "error",
        };
      }
    };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <ChatBox
        title="ChatBOT"
        onSend={fakeAI}
        botName="Helper Bot"
        userName="Me"
      />
    </div>
  );
}
