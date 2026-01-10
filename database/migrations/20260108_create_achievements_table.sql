-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'badge',
    "pointsReward" INTEGER NOT NULL,
    condition TEXT NOT NULL,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT FALSE,
    "unlockedAt" TIMESTAMP NULL,
    "progressCurrent" INTEGER NULL,
    "progressTarget" INTEGER NULL,
    category VARCHAR(20) NOT NULL DEFAULT 'general',
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_achievements_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_type ON achievements(type);
CREATE INDEX idx_achievements_user_type ON achievements(user_id, type);
CREATE INDEX idx_achievements_unlocked_at ON achievements(unlocked_at);
CREATE INDEX idx_achievements_is_unlocked ON achievements(is_unlocked);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_achievements_updated_at
BEFORE UPDATE ON achievements
FOR EACH ROW
EXECUTE FUNCTION update_achievements_updated_at();
