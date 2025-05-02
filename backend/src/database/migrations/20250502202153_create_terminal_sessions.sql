CREATE TABLE terminal_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    challenge_id INTEGER NOT NULL REFERENCES challenges(id),
    container_id VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    config JSONB NOT NULL DEFAULT '{"cols": 80, "rows": 24, "shell": "/bin/bash"}',
    metadata JSONB NOT NULL DEFAULT '{"commandCount": 0, "bytesTransferred": 0}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_terminal_sessions_user ON terminal_sessions(user_id);
CREATE INDEX idx_terminal_sessions_challenge ON terminal_sessions(challenge_id);
CREATE INDEX idx_terminal_sessions_status ON terminal_sessions(status);

-- 命令历史表
CREATE TABLE terminal_commands (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL REFERENCES terminal_sessions(id),
    command TEXT NOT NULL,
    output TEXT,
    exit_code INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_terminal_commands_session ON terminal_commands(session_id);

-- 更新触发器
CREATE OR REPLACE FUNCTION update_terminal_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_terminal_session_timestamp
    BEFORE UPDATE ON terminal_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_terminal_session_timestamp();