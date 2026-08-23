-- ============================================================
-- Migration : Normalisation des statuts de la table breakdowns
-- À exécuter dans Supabase SQL Editor (ou via supabase db push)
-- ============================================================
-- Contexte : L'enum breakdown_status n'accepte que 'open', 'in_progress', 'resolved'.
-- Ce script corrige les éventuelles lignes legacy avec des valeurs françaises
-- insérées avant la mise en place de l'enum, en les castant vers les valeurs anglaises.
-- Il est idempotent : peut être exécuté plusieurs fois sans effet de bord.

-- Étape 1 : Afficher l'état actuel des statuts (diagnostic, pas de modification)
-- SELECT status, count(*) FROM public.breakdowns GROUP BY status ORDER BY status;

-- Étape 2 : Si la colonne est encore en TEXT (vérification préalable)
-- Exécute ce SELECT pour vérifier le type de colonne avant de modifier :
-- SELECT data_type FROM information_schema.columns
--   WHERE table_name = 'breakdowns' AND column_name = 'status';

-- ─────────────────────────────────────────────────────────────────────────────
-- NORMALISATION : Anciens statuts français → valeurs canoniques anglaises
-- ─────────────────────────────────────────────────────────────────────────────
-- Si la colonne est actuellement de type TEXT (pas encore enum) :

DO $$
BEGIN
  -- Vérifie si la colonne status est de type text (et non encore enum)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'breakdowns'
      AND column_name  = 'status'
      AND data_type    = 'text'
  ) THEN
    -- Normalisation des valeurs françaises legacy
    UPDATE public.breakdowns
      SET status = 'open'
      WHERE LOWER(UNACCENT(status)) IN (
        'signalée', 'signalee', 'signale', 'pending', 'nouveau', 'nouvelle'
      );

    UPDATE public.breakdowns
      SET status = 'in_progress'
      WHERE LOWER(UNACCENT(status)) IN (
        'en réparation', 'en reparation', 'en cours', 'in_progress', 'in progress', 'started'
      );

    UPDATE public.breakdowns
      SET status = 'resolved'
      WHERE LOWER(UNACCENT(status)) IN (
        'réparé', 'repare', 'terminé', 'termine', 'completed', 'done', 'résolu', 'resolu'
      );

    -- Convertir la colonne en enum maintenant que les données sont propres
    ALTER TABLE public.breakdowns
      ALTER COLUMN status TYPE public.breakdown_status
      USING status::public.breakdown_status;

    RAISE NOTICE 'Colonne status convertie de TEXT vers breakdown_status enum.';

  -- Si la colonne est déjà de type enum breakdown_status :
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns c
    JOIN pg_type t ON t.typname = 'breakdown_status'
    WHERE c.table_schema = 'public'
      AND c.table_name   = 'breakdowns'
      AND c.column_name  = 'status'
  ) THEN
    RAISE NOTICE 'Colonne status déjà typée breakdown_status enum. Aucune migration nécessaire.';

  ELSE
    RAISE WARNING 'Colonne status introuvable dans breakdowns. Vérifiez votre schéma.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION FINALE
-- ─────────────────────────────────────────────────────────────────────────────
-- Après exécution, vérifiez la répartition des statuts :
SELECT
  status,
  COUNT(*) AS nb_pannes,
  ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
FROM public.breakdowns
GROUP BY status
ORDER BY
  CASE status
    WHEN 'open'        THEN 1
    WHEN 'in_progress' THEN 2
    WHEN 'resolved'    THEN 3
    ELSE                    4
  END;
