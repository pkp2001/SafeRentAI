import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  X,
  Minus,
  Maximize2,
  Loader2,
  MessageSquare,
  Bed,
  Bath,
  MapPin,
  Trash2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  processChatMessage,
  type ChatMessage,
  type SearchCriteria,
} from "@/lib/chatbotAI";
import { type PropertyListing, formatListingPrice } from "@/lib/realtyApi";

// ────────────────────────────────────────────────
// Storage helpers
// ────────────────────────────────────────────────

const STORAGE_KEY = "saferent-chatbot-history";

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as ChatMessage[]).map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveHistory(messages: ChatMessage[]) {
  try {
    // Only persist text — drop heavy property blobs
    const light = messages.map(({ properties, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
  } catch {
    /* quota exceeded — ignore */
  }
}

// ────────────────────────────────────────────────
// Welcome message
// ────────────────────────────────────────────────

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "G'day! 👋 I'm RentBot — your AI property assistant. Tell me what you're looking for and I'll search real listings for you.\n\nTry something like:\n• \"2 bed apartment in Parramatta under $500/week\"\n• \"House near a train station with parking\"",
  timestamp: new Date(),
};

const EXAMPLE_PROMPTS = [
  "2 bed in Parramatta under $500/week",
  "House near train station with parking",
  "Pet-friendly apartment in Bella Vista",
  "3 bedroom close to UTS",
];

// ────────────────────────────────────────────────
// Mini property card for chat
// ────────────────────────────────────────────────

function ChatPropertyCard({
  property,
  onClick,
}: {
  property: PropertyListing;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-3 w-full text-left bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-700 rounded-xl p-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <img
        src={property.images[0] || "https://via.placeholder.com/120x90?text=No+Image"}
        alt=""
        className="w-20 h-16 rounded-lg object-cover flex-shrink-0"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src =
            "https://via.placeholder.com/120x90?text=No+Image";
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-dark-900 dark:text-dark-100 truncate">
          {formatListingPrice(property)}
        </p>
        <p className="text-xs text-dark-500 dark:text-dark-400 truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {property.address.suburb}, {property.address.state}
        </p>
        <div className="flex items-center gap-2.5 text-[11px] text-dark-400 dark:text-dark-500 mt-1">
          <span className="flex items-center gap-0.5">
            <Bed className="w-3 h-3" />
            {property.features.bedrooms}
          </span>
          <span className="flex items-center gap-0.5">
            <Bath className="w-3 h-3" />
            {property.features.bathrooms}
          </span>
          <span className="capitalize">{property.features.propertyType}</span>
        </div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────

export function PropertyChatbot() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadHistory();
    return saved.length > 0 ? saved : [WELCOME];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(0);

  // Track the most recent search criteria so follow-ups carry context forward
  const [activeCriteria, setActiveCriteria] = useState<SearchCriteria | null>(
    () => {
      // Restore from the last assistant message that had searchParams
      const saved = loadHistory();
      for (let i = saved.length - 1; i >= 0; i--) {
        if (saved[i].searchParams) return saved[i].searchParams!;
      }
      return null;
    }
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // Persist history
  useEffect(() => {
    if (messages.length > 1) saveHistory(messages);
  }, [messages]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) setUnread(0);
  }, [isOpen]);

  // ── Send message ────────────────────────────────

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const {
          responseText,
          properties,
          searchCriteria,
          followUpSuggestions,
        } = await processChatMessage(
          content,
          [...messages, userMsg],
          activeCriteria
        );

        // Update active criteria for future follow-ups
        const hasAny = Object.values(searchCriteria).some(
          (v) => v !== null && v !== undefined && v !== ""
        );
        if (hasAny) {
          setActiveCriteria(searchCriteria);
        }

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          properties: properties.length > 0 ? properties : undefined,
          searchParams: hasAny ? searchCriteria : undefined,
          followUpSuggestions:
            followUpSuggestions.length > 0 ? followUpSuggestions : undefined,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (!isOpen) setUnread((n) => n + 1);
      } catch (err) {
        console.error("Chatbot error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content:
              "Sorry, something went wrong. Please try again or use the main search page.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, isOpen, activeCriteria]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setActiveCriteria(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const openListing = (property: PropertyListing) => {
    // Navigate to listing detail with state
    navigate(`/listing/${property.id}`, {
      state: {
        listing: {
          id: property.id,
          user_id: "",
          listing_url: property.listingUrl,
          property_address: property.address.fullAddress,
          rent_amount: property.price.value,
          bedrooms: property.features.bedrooms,
          bathrooms: property.features.bathrooms,
          image_url: property.images[0] || "",
          scam_score: 0,
          scam_flags: [],
          saved_at: new Date().toISOString(),
          property_type: property.features.propertyType,
          parking: property.features.parking,
          suburb: property.address.suburb,
          postcode: property.address.postcode,
          state: property.address.state,
          images: property.images,
          description: property.description,
          dateAvailable: property.dateAvailable,
          agent: property.agent,
        },
        images: property.images,
        description: property.description,
        dateAvailable: property.dateAvailable,
        agent: property.agent,
      },
    });
    setIsOpen(false);
  };

  // ── Floating button (closed state) ─────────────

  if (!isOpen) {
    return (
      <motion.button
        type="button"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.5 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-500 text-white shadow-2xl flex items-center justify-center hover:bg-primary-600 transition-colors"
        aria-label="Open RentBot chat"
      >
        <MessageSquare className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger-500 text-[10px] font-bold flex items-center justify-center text-white">
            {unread}
          </span>
        )}
      </motion.button>
    );
  }

  // ── Chat window ─────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={`fixed z-50 bottom-6 right-6 flex flex-col
          bg-white dark:bg-dark-900 rounded-2xl shadow-2xl
          border border-dark-200 dark:border-dark-700 overflow-hidden
          transition-all duration-300
          ${isMinimized ? "w-72 h-auto" : "w-[22rem] sm:w-96 h-[min(600px,calc(100vh-6rem))]"}`}
      >
        {/* ─── Header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary-500 dark:bg-primary-600 text-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-sm">RentBot</p>
              <p className="text-[10px] text-white/70">AI Property Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* ─── Messages ──────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scroll-smooth">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {/* Bubble */}
                  <div
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === "user"
                          ? "bg-primary-500"
                          : "bg-dark-200 dark:bg-dark-700"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-dark-600 dark:text-dark-300" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="max-w-[80%]">
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? "bg-primary-500 text-white rounded-br-md"
                            : "bg-dark-100 dark:bg-dark-800 text-dark-800 dark:text-dark-200 rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p className="text-[10px] text-dark-400 dark:text-dark-600 mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Property cards */}
                  {msg.properties && msg.properties.length > 0 && (
                    <div className="mt-2.5 ml-9 space-y-2">
                      {msg.properties.map((p) => (
                        <ChatPropertyCard
                          key={p.id}
                          property={p}
                          onClick={() => openListing(p)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {msg.followUpSuggestions &&
                    msg.followUpSuggestions.length > 0 && (
                      <div className="mt-2 ml-9 flex flex-wrap gap-1.5">
                        {msg.followUpSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => sendMessage(s)}
                            className="text-xs px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}

              {/* Example prompts on first load */}
              {messages.length === 1 && !isLoading && (
                <div className="space-y-1.5 ml-9">
                  <p className="text-[11px] text-dark-400 dark:text-dark-500 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Quick searches:
                  </p>
                  {EXAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-dark-50 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      💬 {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-dark-200 dark:bg-dark-700 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-dark-600 dark:text-dark-300" />
                  </div>
                  <div className="bg-dark-100 dark:bg-dark-800 px-4 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                    <span className="text-xs text-dark-400 dark:text-dark-500">
                      Searching…
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ─── Input ─────────────────────────── */}
            <div className="px-3 py-2.5 border-t border-dark-200 dark:border-dark-700 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your ideal rental…"
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2 rounded-xl text-sm
                    bg-dark-50 dark:bg-dark-800
                    border border-dark-200 dark:border-dark-700
                    text-dark-800 dark:text-dark-200
                    placeholder:text-dark-400 dark:placeholder:text-dark-500
                    focus:outline-none focus:ring-2 focus:ring-primary-500/40
                    disabled:opacity-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-1.5 px-1">
                <button
                  type="button"
                  onClick={clearChat}
                  className="flex items-center gap-1 text-[10px] text-dark-400 dark:text-dark-500 hover:text-danger-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear chat
                </button>
                <span className="text-[10px] text-dark-300 dark:text-dark-600">
                  Powered by AI
                </span>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

