import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sendChatMessage } from '../lib/api';
import { ChatRole, type ChatMessage } from '../types';

const SUGGESTED_QUESTIONS = [
  'What is our overall net profit margin across all Home Depot locations?',
  'How have our average travel costs per survey changed over the last 24 months?',
  'Run an audit on technician expenses. Are there any duplicate billings or large purchases?',
  'Which project has the highest profit margin?',
  'What is our projected expense run-rate for the upcoming quarter?',
];

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: ChatRole.Assistant,
      content:
        "I'm your **AI CFO** for Robotic Imaging. I have real-time access to your financial database and can analyze profitability, forecast costs, and audit technician expenses.\n\nTry asking me about profit margins, travel cost trends, or expense anomalies.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (messageText?: string) => {
    const text = messageText ?? input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const history = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await sendChatMessage({ message: text, conversationHistory: history });
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: response.response, timestamp: new Date() },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white border border-gray-200 dark:bg-slate-800/60 dark:border-slate-700/50 backdrop-blur-sm rounded-xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">AI CFO</h3>
          <p className="text-gray-500 dark:text-slate-400 text-xs">Powered by Gemini &bull; Function Calling</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user'
                ? 'bg-blue-600'
                : 'bg-gray-100 dark:bg-slate-700'
            }`}>
              {msg.role === 'user'
                ? <User size={14} className="text-white" />
                : <Sparkles size={14} className="text-blue-500 dark:text-blue-400" />
              }
            </div>
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 dark:bg-slate-700/50 dark:text-slate-200'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="chat-markdown">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gray-100 dark:bg-slate-700">
              <Sparkles size={14} className="text-blue-500 dark:text-blue-400" />
            </div>
            <div className="bg-gray-100 dark:bg-slate-700/50 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Querying database &amp; analyzing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Try these questions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSubmit(q)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600/50 hover:border-gray-300 dark:hover:border-slate-500 transition-colors"
              >
                {q.length > 60 ? q.slice(0, 57) + '...' : q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI CFO about financials, forecasts, or audits..."
            rows={1}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 resize-none transition-colors"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 text-white p-2.5 rounded-lg transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
