// ═══════════════════════════════════════════════════════════════════════════
// ConsentManager.jsx — Gestionnaire RGPD auditable (état centralisé)
// Stocke les consentements en DB Supabase + localStorage pour UX rapide
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { rgpdService } from '@/api/services';
import { Shield, X, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Contexte ────────────────────────────────────────────────────────────────
const ConsentContext = createContext(null);
const VERSION = '1.0';
const STORAGE_KEY = 'pevele_consent_v1';

function getSessionId() {
  let sid = sessionStorage.getItem('_pevele_sid');
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem('_pevele_sid', sid); }
  return sid;
}

export const ConsentProvider = ({ children }) => {
  const [consents, setConsents]       = useState(null); // null = non chargé
  const [showBanner, setShowBanner]   = useState(false);
  const [isLoaded, setIsLoaded]       = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.version === VERSION) {
          setConsents(parsed.consents);
          setShowBanner(false);
          setIsLoaded(true);
          return;
        }
      } catch (_) {}
    }
    setShowBanner(true);
    setIsLoaded(true);
  }, []);

  const saveConsents = useCallback(async (newConsents) => {
    setConsents(newConsents);
    setShowBanner(false);
    // Persistance locale (UX immédiate)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, consents: newConsents, savedAt: new Date().toISOString() }));
    // Persistance DB (audit)
    await rgpdService.saveConsents({
      ...newConsents,
      session_id: getSessionId(),
    }).catch(() => {}); // non bloquant
  }, []);

  const acceptAll = useCallback(() => saveConsents({ analytics: true, marketing: true, fonctionnel: true }), [saveConsents]);
  const refuseAll = useCallback(() => saveConsents({ analytics: false, marketing: false, fonctionnel: true }), [saveConsents]);
  const updateConsent = useCallback((type, value) => {
    setConsents(prev => {
      const updated = { ...prev, [type]: value };
      saveConsents(updated);
      return updated;
    });
  }, [saveConsents]);

  const hasConsent = useCallback((type) => consents?.[type] === true, [consents]);
  const openPreferences = useCallback(() => setShowBanner(true), []);

  return (
    <ConsentContext.Provider value={{ consents, hasConsent, acceptAll, refuseAll, updateConsent, openPreferences, isLoaded }}>
      {children}
      {isLoaded && showBanner && <ConsentBanner onAcceptAll={acceptAll} onRefuseAll={refuseAll} onSave={saveConsents} current={consents} />}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent doit être dans ConsentProvider');
  return ctx;
};

// ─── Bannière RGPD ───────────────────────────────────────────────────────────
function ConsentBanner({ onAcceptAll, onRefuseAll, onSave, current }) {
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({
    analytics:   current?.analytics   ?? false,
    marketing:   current?.marketing   ?? false,
    fonctionnel: true, // toujours requis
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 md:p-4" role="dialog" aria-label="Gestion des cookies">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">Vos données, votre choix</h3>
              <p className="text-xs text-gray-600 mt-1">
                Nous utilisons des cookies fonctionnels (indispensables) et optionnels pour améliorer votre expérience.
                <a href="/rgpd" className="text-orange-500 underline ml-1">En savoir plus</a>
              </p>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {[
                { key: 'fonctionnel', label: 'Fonctionnels', desc: 'Connexion, sécurité, mémorisation de commune. Requis.', required: true },
                { key: 'analytics',  label: 'Statistiques', desc: 'Mesure d\'audience anonymisée pour améliorer la plateforme.' },
                { key: 'marketing',  label: 'Communication', desc: 'Notifications sur les événements locaux qui vous intéressent.' },
              ].map(({ key, label, desc, required }) => (
                <label key={key} className={`flex items-start gap-3 cursor-${required ? 'default' : 'pointer'}`}>
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    disabled={required}
                    onChange={e => !required && setPrefs(p => ({ ...p, [key]: e.target.checked }))}
                    className="mt-1 accent-orange-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{label}{required && <span className="text-xs text-gray-400 ml-1">(requis)</span>}</div>
                    <div className="text-xs text-gray-500">{desc}</div>
                  </div>
                </label>
              ))}
              <button onClick={() => onSave(prefs)}
                className="w-full py-2 px-4 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                Enregistrer mes préférences
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={onRefuseAll}
              className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              Refuser tout
            </button>
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 py-2 px-3 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              Personnaliser {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button onClick={onAcceptAll}
              className="flex-1 py-2 px-3 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
