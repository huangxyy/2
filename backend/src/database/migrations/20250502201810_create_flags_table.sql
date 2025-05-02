-- Flag表
CREATE TABLE flags (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    flag TEXT NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('static', 'dynamic', 'regex')),
    points INTEGER NOT NULL CHECK (points >= 0),
    "order" INTEGER NOT NULL,
    hint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(challenge_id, "order")
);

-- Flag提交记录表
CREATE TABLE flag_submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    flag_id INTEGER NOT NULL REFERENCES flags(id),
    submitted TEXT NOT NULL,
    correct BOOLEAN NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, flag_id)
);

-- 创建索引
CREATE INDEX idx_flags_challenge ON flags(challenge_id);
CREATE INDEX idx_flag_submissions_user ON flag_submissions(user_id);
CREATE INDEX idx_flag_submissions_challenge ON flag_submissions(challenge_id);