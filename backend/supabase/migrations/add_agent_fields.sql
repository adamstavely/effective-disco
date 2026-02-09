-- Migration: Add new fields to agents table for Phase 1.3
-- Run this if you already have an existing database

-- Add new columns to agents table
ALTER TABLE agents 
  ADD COLUMN IF NOT EXISTS avatar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role_tag VARCHAR(50),
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS character TEXT,
  ADD COLUMN IF NOT EXISTS lore TEXT;

-- No indexes needed for these fields as they are not frequently queried
-- The existing indexes on agents table are sufficient
