// ═══════════════════════════════════════════════════════════════════════════
// schemas.js — Validation Zod (zero data corruption)
// Tous les inputs utilisateur passent par ici avant d'aller en DB
// ═══════════════════════════════════════════════════════════════════════════
import { z } from 'zod';

// ─── Primitives réutilisables ────────────────────────────────────────────────
const emailFr = z.string().email('Adresse email invalide').max(254);
const telFr   = z.string().regex(/^(\+33|0)[1-9](\d{8})$/, 'Numéro de téléphone invalide').optional().or(z.literal(''));
const urlOpt  = z.string().url().optional().or(z.literal(''));
const latFr   = z.number().min(41).max(51.5);
const lonFr   = z.number().min(-5.5).max(10);

// ─── Village Post ────────────────────────────────────────────────────────────
export const villagePostSchema = z.object({
  commune_id:  z.string().uuid('Commune invalide'),
  type_post:   z.enum(['victoire','merci_local','appel_aide','message_maire','info'], { errorMap: () => ({ message: 'Type de post invalide' }) }),
  titre:       z.string().min(3, 'Titre trop court (3 min)').max(150, 'Titre trop long (150 max)').trim(),
  contenu:     z.string().min(10, 'Contenu trop court (10 min)').max(2000, 'Contenu trop long (2000 max)').trim(),
  photo_url:   urlOpt,
  is_anonymous: z.boolean().default(false),
});

// ─── Dossier citoyen ─────────────────────────────────────────────────────────
export const dossierSchema = z.object({
  commune_id:   z.string().uuid('Commune invalide').optional(),
  type_dossier: z.enum(['signalement','proposition','demande','urgence']).default('signalement'),
  titre:        z.string().min(3).max(200).trim(),
  description:  z.string().min(20, 'Description trop courte (20 min)').max(3000).trim(),
  adresse:      z.string().max(200).optional(),
  latitude:     latFr.optional(),
  longitude:    lonFr.optional(),
});

// ─── Covoiturage ────────────────────────────────────────────────────────────
export const covoiturageSchema = z.object({
  adresse_depart:   z.string().min(5, 'Adresse de départ requise').max(200).trim(),
  latitude_depart:  latFr,
  longitude_depart: lonFr,
  commune_arrivee:  z.string().min(2, 'Destination requise').max(100).trim(),
  adresse_arrivee:  z.string().min(5).max(200).trim(),
  heure_depart:     z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  jours_semaine:    z.array(z.number().min(1).max(7)).min(1, 'Au moins un jour requis'),
  places_dispo:     z.number().int().min(1).max(7),
  contribution_eur: z.number().min(0).max(50).default(0),
  commentaire:      z.string().max(500).optional(),
}).refine(d => d.latitude_depart && d.longitude_depart, {
  message: 'Coordonnées GPS requises (utilisez la carte)',
  path: ['latitude_depart'],
});

export const covoiturageSearchSchema = z.object({
  lat_depart:      latFr,
  lon_depart:      lonFr,
  commune_arrivee: z.string().optional(),
  heure_depart:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  jours:           z.array(z.number().min(1).max(7)).optional(),
  rayon_km:        z.number().min(1).max(50).default(15),
});

// ─── Lead Mairie-Plus ────────────────────────────────────────────────────────
export const leadDemoSchema = z.object({
  commune_nom:   z.string().min(2, 'Nom de commune requis').max(100).trim(),
  contact_nom:   z.string().min(2, 'Votre nom est requis').max(100).trim(),
  contact_email: emailFr,
  contact_tel:   telFr,
  role:          z.string().max(100).optional(),
  message:       z.string().max(1000).optional(),
  commune_pop:   z.number().int().min(0).optional(),
});

// ─── Compte utilisateur ──────────────────────────────────────────────────────
export const signUpSchema = z.object({
  email:    emailFr,
  password: z.string()
    .min(8, 'Mot de passe trop court (8 min)')
    .regex(/[A-Z]/, 'Doit contenir une majuscule')
    .regex(/[0-9]/, 'Doit contenir un chiffre'),
  display_name: z.string().min(2, 'Pseudo trop court').max(50).trim(),
}).refine(d => d.email && d.password, { message: 'Email et mot de passe requis' });

export const signInSchema = z.object({
  email:    emailFr,
  password: z.string().min(1, 'Mot de passe requis'),
});

// ─── Helper : valider et retourner erreurs lisibles ──────────────────────────
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, data: null, errors };
}
