// ═══════════════════════════════════════════════════════════════════════════
// Messagerie.jsx — Sprint 1 (Vivant) — DM & groupes en temps réel
// Stack : Supabase Realtime + RLS. Aucune lib externe, code minimal.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Send, MessageSquarePlus, Loader2, Sparkles, ArrowLeft, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PresenceBar from "@/components/PresenceBar";

function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return Math.floor(s / 60) + " min";
  if (s < 86400) return Math.floor(s / 3600) + " h";
  return Math.floor(s / 86400) + " j";
}

function ConversationList({ items, activeId, onSelect, onNew }) {
  return (
    <div className="w-full md:w-80 border-r border-orange-100 bg-white flex flex-col">
      <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-white">
        <h2 className="font-bold text-ink text-lg">Messages</h2>
        <button
          onClick={onNew}
          className="px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm hover:scale-105 transition-transform"
          style={{ backgroundColor: "#FF6A00" }}
        >
          <MessageSquarePlus className="w-4 h-4 inline -mt-0.5 mr-1" />Nouveau
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            Aucune conversation. Démarre la première !
          </div>
        )}
        {items.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full text-left p-4 border-b border-gray-50 hover:bg-orange-50 transition-colors ${activeId === c.id ? "bg-orange-50" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-ink truncate">
                {c.is_group ? "👥 " : "💬 "}{c.title || "Conversation"}
              </span>
              <span className="text-[10px] text-gray-400">{timeAgo(c.last_message_at)}</span>
            </div>
            {c.last_preview && (
              <div className="text-xs text-gray-500 truncate mt-0.5">{c.last_preview}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatWindow({ conv, user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const endRef = useRef(null);

  // Load messages
  useEffect(() => {
    if (!conv) return;
    setLoading(true);
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setMessages(data || []);
        setLoading(false);
      });
  }, [conv?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!conv) return;
    const channel = supabase
      .channel(`messages:${conv.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` },
        payload => {
          setMessages(m => [...m, payload.new]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conv.id,
      sender_id: user.id,
      body,
    });
    if (!error) setDraft("");
    setSending(false);
  };

  // IA résumé local (pas d'edge function : on génère côté front un mini-résumé naïf des derniers messages)
  // Branchable plus tard sur Claude Haiku via Edge Function /functions/v1/summarize-conv
  const summarize = async () => {
    setSummarizing(true);
    try {
      const last = messages.slice(-30).map(m => m.body).join(" ");
      // Heuristique simple : extrait les mots fréquents > 4 char + dernière phrase
      const words = last.toLowerCase().match(/[a-zàâçéèêëîïôûùüÿñæœ]{4,}/g) || [];
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
      const phrases = last.split(/[.!?]/).filter(s => s.trim().length > 10);
      const lastPhrase = phrases[phrases.length - 1]?.trim().slice(0, 120) || "Pas assez de contenu.";
      setSummary({
        topics: top,
        last: lastPhrase,
        count: messages.length,
      });
    } finally {
      setSummarizing(false);
    }
  };

  if (!conv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-orange-50/30">
        <MessageSquarePlus className="w-16 h-16 mb-4" style={{ color: "#FF6A00" }} />
        <h3 className="font-bold text-xl text-ink mb-2">Sélectionne une conversation</h3>
        <p className="text-sm text-gray-600 max-w-sm">Ou démarre-en une nouvelle pour discuter avec tes voisins de la Pévèle.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-orange-50/30 to-white">
      <div className="p-4 border-b border-orange-100 flex items-center gap-3 bg-white shadow-sm">
        <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-orange-50">
          <ArrowLeft className="w-5 h-5 text-ink" />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: "#FF6A00" }}>
          {conv.is_group ? <Users className="w-5 h-5" /> : "💬"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-ink truncate">{conv.title || "Conversation"}</div>
          <div className="text-[11px] text-gray-500">{messages.length} messages</div>
        </div>
        <button
          onClick={summarize}
          disabled={summarizing || messages.length < 3}
          className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 hover:from-orange-200 hover:to-amber-200 disabled:opacity-50 transition-all"
          title="Résumé IA"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {summarizing ? "..." : "Résumé"}
        </button>
      </div>

      {summary && (
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-xs">
          <div className="flex items-center gap-1 font-bold text-orange-800 mb-1">
            <Sparkles className="w-3 h-3" /> Résumé IA ({summary.count} messages)
          </div>
          <div className="text-gray-700">Sujets : {summary.topics.join(", ") || "—"}</div>
          <div className="text-gray-600 mt-1 italic">« {summary.last} »</div>
          <button onClick={() => setSummary(null)} className="text-orange-600 text-[10px] underline mt-1">fermer</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <div className="text-center text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin inline" /> Chargement...</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">Aucun message. Lance la conversation !</div>
        )}
        {messages.map(m => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${mine ? "text-white rounded-br-sm" : "bg-white text-ink rounded-bl-sm border border-orange-100"}`}
                style={mine ? { backgroundColor: "#FF6A00" } : {}}
              >
                {m.body}
                <div className={`text-[9px] mt-0.5 ${mine ? "text-orange-100" : "text-gray-400"}`}>{timeAgo(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-orange-100 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Écrire un message…"
            maxLength={4000}
            className="flex-1 px-4 py-2.5 rounded-full bg-orange-50 border border-orange-100 focus:border-orange-300 focus:outline-none text-sm"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform disabled:opacity-50"
            style={{ backgroundColor: "#FF6A00" }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewConvModal({ onClose, onCreated, user }) {
  const [title, setTitle] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ is_group: isGroup, title: title.trim(), created_by: user.id })
      .select()
      .single();
    if (!error && conv) {
      await supabase.from("conversation_members").insert({ conversation_id: conv.id, user_id: user.id });
      onCreated(conv);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-xl text-ink mb-4">Nouvelle conversation</h3>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Titre (ex: Apéro de samedi)"
          className="w-full px-4 py-2.5 rounded-xl border border-orange-200 focus:border-orange-400 focus:outline-none mb-3"
        />
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
          <input type="checkbox" checked={isGroup} onChange={e => setIsGroup(e.target.checked)} />
          Conversation de groupe
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={create}
            disabled={busy || !title.trim()}
            className="flex-1 px-4 py-2 rounded-full text-white text-sm font-bold shadow-md hover:scale-105 transition-transform disabled:opacity-50"
            style={{ backgroundColor: "#FF6A00" }}
          >
            {busy ? "..." : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Messagerie() {
  const { user, isLoadingAuth } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadConvs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // RLS filtre automatiquement aux conversations où je suis membre
    const { data } = await supabase
      .from("conversations")
      .select("id, is_group, title, last_message_at, created_at")
      .order("last_message_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  // Realtime : nouvelle conv ou nouveau message → reload
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("conversations:list")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConvs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, loadConvs]);

  if (isLoadingAuth) return <div className="p-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin inline" /></div>;
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 text-center bg-white rounded-3xl shadow-md">
        <h2 className="font-bold text-xl text-ink mb-3">Messagerie</h2>
        <p className="text-sm text-gray-600 mb-4">Connecte-toi pour discuter avec tes voisins.</p>
        <Link to="/connexion" className="inline-block px-6 py-2.5 rounded-full text-white font-bold shadow-md" style={{ backgroundColor: "#FF6A00" }}>
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 py-4">
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-black text-ink">💬 Messagerie</h1>
        <PresenceBar />
      </div>
      <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-orange-100" style={{ height: "calc(100vh - 200px)", minHeight: 500 }}>
        <div className="flex h-full">
          <div className={`${active ? "hidden md:flex" : "flex"} flex-col`}>
            <ConversationList items={conversations} activeId={active?.id} onSelect={setActive} onNew={() => setShowNew(true)} />
          </div>
          <ChatWindow conv={active} user={user} onBack={() => setActive(null)} />
        </div>
      </div>
      {showNew && (
        <NewConvModal
          user={user}
          onClose={() => setShowNew(false)}
          onCreated={c => { setShowNew(false); setActive(c); loadConvs(); }}
        />
      )}
    </div>
  );
}
