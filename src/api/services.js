// ═══════════════════════════════════════════════════════════════════════════
// services.js — Couche data Supabase (remplace tous les appels base44)
// Pattern : chaque fonction retourne { data, error } + gère loading/optimistic
// ═══════════════════════════════════════════════════════════════════════════
import { supabase } from './supabaseClient';

// ─── COMMUNES ───────────────────────────────────────────────────────────────
export const communesService = {
  async list() {
    const { data, error } = await supabase
      .from('communes')
      .select('id, name, code_insee, code_postal, population, latitude, longitude, active')
      .eq('active', true)
      .order('name');
    return { data: data || [], error };
  },
  async getByInsee(code_insee) {
    const { data, error } = await supabase
      .from('communes')
      .select('*')
      .eq('code_insee', code_insee)
      .single();
    return { data, error };
  },
};

// ─── VILLAGE POSTS ──────────────────────────────────────────────────────────
export const villageService = {
  async getPosts({ commune_id, type_post, limit = 50 } = {}) {
    let q = supabase
      .from('v_village_posts_public')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (commune_id) q = q.eq('commune_id', commune_id);
    if (type_post)  q = q.eq('type_post', type_post);
    const { data, error } = await q;
    return { data: data || [], error };
  },

  async createPost({ commune_id, type_post, titre, contenu, photo_url, is_anonymous = false }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('village_posts')
      .insert({
        commune_id, type_post, titre, contenu, photo_url,
        is_anonymous, author_id: user?.id,
        statut: 'publie',
      })
      .select()
      .single();
    return { data, error };
  },

  async react({ post_id, type, session_id }) {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = user
      ? { post_id, type, user_id: user.id }
      : { post_id, type, session_id };
    // Upsert : si même user/session+type → toggle (delete puis insert)
    const { data: existing } = await supabase
      .from('village_reactions')
      .select('id')
      .match(user ? { post_id, user_id: user.id } : { post_id, session_id })
      .single();
    if (existing) {
      const { error } = await supabase.from('village_reactions').delete().eq('id', existing.id);
      return { data: null, removed: true, error };
    }
    const { data, error } = await supabase.from('village_reactions').insert(payload).select().single();
    return { data, removed: false, error };
  },

  subscribeToNewPosts(callback) {
    return supabase.channel('village-posts-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'village_posts', filter: 'statut=eq.publie' }, callback)
      .subscribe();
  },
};

// ─── DOSSIERS ───────────────────────────────────────────────────────────────
export const dossiersService = {
  async create({ commune_id, type_dossier, titre, description, latitude, longitude, adresse, photos = [] }) {
    const { data: { user } } = await supabase.auth.getUser();
    // Rate-limit DB-side
    const { data: allowed } = await supabase.rpc('check_rate_limit', {
      p_key: `dossier_${user?.id || adresse || 'anon'}`,
      p_max: 5,
    });
    if (!allowed) return { data: null, error: { message: 'Limite de soumissions atteinte. Réessayez dans 1h.' } };

    const { data, error } = await supabase
      .from('dossiers')
      .insert({ commune_id, type_dossier, titre, description, latitude, longitude, adresse, photos, author_id: user?.id })
      .select('id, token_public')
      .single();
    return { data, error };
  },

  async getByToken(token_public) {
    const { data, error } = await supabase
      .from('dossiers')
      .select('*, dossier_updates(*)')
      .eq('token_public', token_public)
      .single();
    return { data, error };
  },

  async listForMairie(commune_id) {
    const { data, error } = await supabase
      .from('dossiers')
      .select('*, dossier_updates(count)')
      .eq('commune_id', commune_id)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  },
};

// ─── ÉVÉNEMENTS ─────────────────────────────────────────────────────────────
export const evenementsService = {
  async list({ commune_id, upcoming = true } = {}) {
    let q = supabase
      .from('evenements')
      .select('*')
      .eq('published', true)
      .order('date_start');
    if (commune_id) q = q.eq('commune_id', commune_id);
    if (upcoming)   q = q.gte('date_start', new Date().toISOString());
    const { data, error } = await q.limit(50);
    return { data: data || [], error };
  },
};

// ─── COVOITURAGE (Pévèle Connect) ───────────────────────────────────────────
export const covoiturageService = {
  async search({ lat, lon, commune_arrivee, heure_depart, jours, rayon_km = 15 }) {
    const { data, error } = await supabase.functions.invoke('covoit-match', {
      body: { lat_depart: lat, lon_depart: lon, commune_arrivee, heure_depart, jours, rayon_km },
    });
    return { data: data?.results || [], error };
  },

  async create(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Connexion requise' } };
    const { data, error } = await supabase
      .from('covoiturages')
      .insert({ ...payload, conducteur_id: user.id })
      .select()
      .single();
    return { data, error };
  },

  async demanderPlace({ trajet_id, message }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Connexion requise' } };
    const { data, error } = await supabase
      .from('covoiturage_demandes')
      .insert({ trajet_id, passager_id: user.id, message })
      .select()
      .single();
    return { data, error };
  },

  subscribeToNewTrajets(callback) {
    return supabase.channel('covoiturages-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'covoiturages', filter: "statut=eq.actif" }, callback)
      .subscribe();
  },
};

// ─── LEADS MAIRIE-PLUS ───────────────────────────────────────────────────────
export const leadsService = {
  async create(payload) {
    const { data, error } = await supabase.from('leads_demo').insert(payload).select('id').single();
    return { data, error };
  },
};

// ─── CONSENTEMENTS RGPD ──────────────────────────────────────────────────────
export const rgpdService = {
  async saveConsents({ analytics, marketing, fonctionnel, session_id, user_id }) {
    const version = '1.0';
    const user_agent = navigator.userAgent.slice(0, 200);
    const rows = [
      { type: 'analytics',   consenti: analytics,   version, user_agent, session_id, user_id },
      { type: 'marketing',   consenti: marketing,   version, user_agent, session_id, user_id },
      { type: 'fonctionnel', consenti: fonctionnel, version, user_agent, session_id, user_id },
    ].map(r => user_id ? r : { ...r, user_id: undefined });

    const { error } = await supabase.from('consentements_rgpd').upsert(rows, {
      onConflict: user_id ? 'user_id,type' : 'session_id,type',
      ignoreDuplicates: false,
    });
    return { error };
  },

  async getConsents(session_id) {
    const { data, error } = await supabase
      .from('consentements_rgpd')
      .select('type, consenti, created_at')
      .eq('session_id', session_id);
    return { data: data || [], error };
  },
};

// ─── MARKETPLACE ─────────────────────────────────────────────────────────────
export const marketplaceService = {
  async list({ commune_id, categorie } = {}) {
    let q = supabase.from('marketplace_listings').select('*').eq('statut', 'actif').order('created_at', { ascending: false });
    if (commune_id) q = q.eq('commune_id', commune_id);
    if (categorie)  q = q.eq('categorie', categorie);
    const { data, error } = await q.limit(100);
    return { data: data || [], error };
  },
};
