# Plan — Chauffeurs multiples, documents & suivi GPS

Trois chantiers livrables séparément. Vous validez, j'implémente dans l'ordre.

---

## Chantier 1 — Documents chauffeur (PJ) + véhicule détaillé

**Base de données**
- Nouveau bucket Storage privé `driver-documents` (RLS : le chauffeur voit/uploade ses propres fichiers ; admin voit tout).
- Nouvelle table `driver_documents` :
  - `driver_id`, `document_type` (enum : `id_card`, `passport`, `driving_license`, `vtc_card`, `vehicle_insurance`, `civil_liability`), `file_path`, `mime_type`, `uploaded_at`, `verified` (bool), `verified_at`, `verified_by`.
- Extension table `drivers` : ajout `vehicle_type`, `vehicle_brand`, `vehicle_year`, `vehicle_color` (les colonnes `vehicle_model` et `vehicle_plate` existent déjà).

**Espace chauffeur (`/espace-chauffeur`)**
- Nouvelle section "Mes documents" : upload (drag & drop) photo (JPG/PNG) ou PDF par catégorie, prévisualisation, statut (en attente / validé / refusé), remplacement.
- Nouvelle section "Mon véhicule" : formulaire (type, marque, modèle, année, couleur, immatriculation).

**Espace admin (`/admin`)**
- Nouvelle vue "Chauffeurs en attente" : liste candidats `status='pending'`, accès direct aux documents (visionneuse PDF/image), boutons **Valider** / **Refuser** avec motif.
- Validation chauffeur ⇒ `drivers.status = 'approved'` + `user_roles` ajoute le rôle `driver`.

---

## Chantier 2 — Multi-chauffeurs : attribution des courses

> Note : les tables `drivers`, `driver_availabilities` et le rôle `driver` existent déjà — c'est ce chantier qui les rend réellement exploitables côté UI.

- Réservation créée ⇒ statut `pending_assignment`.
- Admin voit la liste des chauffeurs **approuvés + disponibles** sur le créneau, assigne manuellement (V1).
- Chauffeur assigné reçoit la course dans son espace, peut **accepter / refuser**. Refus ⇒ retour au pool admin.
- Statuts course : `pending_assignment` → `assigned` → `accepted` → `in_progress` → `completed` / `cancelled`.

*(Auto-attribution intelligente = V2, pas dans ce lot.)*

---

## Chantier 3 — Suivi GPS temps réel chauffeur ↔ client

**Base**
- Table `course_tracking` : `reservation_id`, `actor` (`driver`|`client`), `lat`, `lng`, `heading`, `speed`, `recorded_at`. Realtime activé.
- Démarrage du tracking **uniquement** quand course passe `in_progress`, arrêt à `completed`.

**Côté chauffeur**
- Bouton "Démarrer la course" ⇒ `navigator.geolocation.watchPosition` envoie la position toutes les ~5 s.
- Wake lock pour éviter mise en veille pendant la course.

**Côté client**
- Page suivi accessible depuis un **lien unique** envoyé par email/SMS après confirmation (token signé — pas besoin de compte).
- Carte Google Maps : marqueur chauffeur (animé), marqueur client (position partagée si autorisé), trajet restant, ETA, indicateur "en mouvement / à l'arrêt".
- Bouton "Partager ma position" côté client (optionnel) pour que le chauffeur le voie sur place difficile à trouver.

**Vie privée**
- Positions purgées 24 h après `completed` (cron).
- Géoloc client = opt-in explicite.

---

## Décisions à prendre avant que je code

1. **Validation chauffeur** : approbation = tous les documents validés un par un, ou approbation globale du dossier d'un coup ?
2. **Attribution** : on part sur **manuelle par admin** en V1 (recommandé) ?
3. **Suivi GPS** : OK pour le lien-token par email (pas besoin que le client crée un compte) ?
4. **Ordre** : je propose **Chantier 1 d'abord** (documents = bloquant légal), puis 2, puis 3. OK ?
