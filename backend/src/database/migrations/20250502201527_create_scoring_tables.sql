-- 评分规则表
CREATE TABLE score_rules (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    base_score INTEGER NOT NULL,
    time_bonus_threshold INTEGER NOT NULL,
    time_bonus_score INTEGER NOT NULL,
    difficulty_multiplier_easy DECIMAL(3,2) NOT NULL,
    difficulty_multiplier_medium DECIMAL(3,2) NOT NULL,
    difficulty_multiplier_hard DECIMAL(3,2) NOT NULL,
    first_blood_bonus INTEGER NOT NULL,
    attempt_penalty INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_scores CHECK (
        base_score >= 0 AND
        time_bonus_score >= 0 AND
        first_blood_bonus >= 0
    )
);

-- 用户得分表
CREATE TABLE user_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    score INTEGER NOT NULL,
    completion_time INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    is_first_blood BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

-- 用户进度表
CREATE TABLE user_progress (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    total_score INTEGER NOT NULL DEFAULT 0,
    completed_challenges INTEGER NOT NULL DEFAULT 0,
    ranking INTEGER,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 更新触发器
CREATE OR REPLACE FUNCTION update_user_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新用户进度
    INSERT INTO user_progress (user_id, total_score, completed_challenges)
    VALUES (NEW.user_id, NEW.score, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET total_score = user_progress.total_score + NEW.score,
        completed_challenges = user_progress.completed_challenges + 1,
        last_active = CURRENT_TIMESTAMP;
    
    -- 更新排名
    WITH rankings AS (
        SELECT user_id, RANK() OVER (ORDER BY total_score DESC) as new_rank
        FROM user_progress
    )
    UPDATE user_progress up
    SET ranking = r.new_rank
    FROM rankings r
    WHERE up.user_id = r.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_score_trigger
AFTER INSERT ON user_scores
FOR EACH ROW
EXECUTE FUNCTION update_user_progress();