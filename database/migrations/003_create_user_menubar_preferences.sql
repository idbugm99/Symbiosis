-- Migration: Create user_menubar_preferences table
-- Description: Store user-specific menu bar configuration
-- Created: 2024-12-14

-- Create user_menubar_preferences table
CREATE TABLE IF NOT EXISTS user_menubar_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint (assuming users table exists)
  CONSTRAINT fk_user_menubar_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  -- Unique constraint: one config per user
  CONSTRAINT unique_user_menubar_config
    UNIQUE (user_id)
);

-- Create index for faster user lookups
CREATE INDEX idx_user_menubar_user_id ON user_menubar_preferences(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_menubar_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_menubar_preferences_updated_at
  BEFORE UPDATE ON user_menubar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_menubar_preferences_updated_at();

-- Add comment to table
COMMENT ON TABLE user_menubar_preferences IS 'Stores user-specific menu bar plugin configurations';
COMMENT ON COLUMN user_menubar_preferences.config IS 'JSONB object containing menu bar layout, plugin settings, and preferences';
