-- Migration: 4-tier pricing (free→hobby, pro→scale for grandfathering)
-- Existing Pro subscribers get Scale (highest paid tier).
-- Existing Free users get Hobby.

UPDATE "User" SET "subscriptionTier" = 'hobby' WHERE "subscriptionTier" = 'free';
UPDATE "User" SET "subscriptionTier" = 'scale' WHERE "subscriptionTier" = 'pro';

-- Update schema default from 'free' to 'hobby'
ALTER TABLE "User" ALTER COLUMN "subscriptionTier" SET DEFAULT 'hobby';
