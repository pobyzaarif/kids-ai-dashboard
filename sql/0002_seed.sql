-- =============================================================================
-- kids-ai-dashboard — Seeders (idempotent)
-- -----------------------------------------------------------------------------
-- Re-running never duplicates rows nor overwrites changes made via the console
-- (every INSERT is keyed by a unique constraint with ON CONFLICT DO NOTHING).
--
-- Seeded credentials (dev only — change in real deployments):
--   admin@kids-ai.local / admin123   (role: admin)
--   user@kids-ai.local  / user123    (role: user)
-- =============================================================================

-- Users -----------------------------------------------------------------------
INSERT INTO users (email, password_hash, display_name, role) VALUES
  ('admin@kids-ai.local', '$2b$10$giRCC7KHQZOEAISE3QLLw.V379C.zrDTu.yV1WuKeXC0NZDOPamXq', 'Console Admin', 'admin'),
  ('user@kids-ai.local',  '$2b$10$s8qQrMU/bChrhkrpNc3/O.pTkdDEfSmD.gqv5s8RtsUFhBOTbCHqC', 'Demo Parent',   'user')
ON CONFLICT (lower(email)) DO NOTHING;

-- System roles (user_id IS NULL = shared presets) ------------------------------
INSERT INTO roles (user_id, name, description, system_prompt, voice, temperature, is_default) VALUES
  (NULL, 'Storyteller',
   'Warm storyteller narrating folk tales and adventures.',
   'You are Luna and you are Story Buddy, a warm storyteller for children aged 5-10. Narrate folk tales and adventures with lively characters, sound effects and gentle cliffhangers. Always end with a playful question. Keep sentences short and vocabulary simple. Never use violence, scary themes, or adult content.',
   'cheerful', 0.70, true),
  (NULL, 'Tutor',
   'Patient tutor that explains with examples and quizzes.',
   'You are Professor Pico, a patient tutor for children aged 6-12. Explain concepts with everyday examples and tiny stories. After each explanation ask one short quiz question. Praise effort, never shame mistakes. Keep answers under 120 words. Never use violence, scary themes, or adult content.',
   'calm', 0.40, true),
  (NULL, 'Buddy',
   'Friendly daily companion for chats and games.',
   'You are Bibo and you are Buddy, a kind and playful friend for a child. Chat about their day, play word games, and encourage curiosity, kindness and sharing. Keep answers short and cheerful. If the child seems sad, be comforting and suggest telling a parent. Never use violence, scary themes, or adult content.',
   'bright', 0.80, true)
ON CONFLICT (lower(name)) WHERE user_id IS NULL DO NOTHING;

-- Feature catalog --------------------------------------------------------------
INSERT INTO features (code, name, description, type, config, is_active) VALUES
  ('memory', 'Long-term Memory',
   'Remember facts your child shares (favorites, pets, friends) and reuse them in later conversations.',
   'builtin', '{}'::jsonb, true),
  ('kb_search', 'Story Knowledge Base',
   'Ground answers in your kids-kb story library via semantic search before answering.',
   'builtin', '{}'::jsonb, true),
  ('story_mode', 'Story Mode',
   'Tell one story per session with cliffhangers and comprehension questions.',
   'builtin', '{}'::jsonb, true),
  ('bedtime_mode', 'Bedtime Mode',
   'Calmer voice, shorter answers and sleep-friendly pacing during evening hours.',
   'builtin', '{}'::jsonb, false),
  ('mcp_tools_demo', 'Demo MCP Tools',
   'Example MCP endpoint entry demonstrating the settings shape. Register your real MCP endpoints here.',
   'mcp',
   jsonb_build_object(
     'endpoint_url', 'https://mcp.example.com/sse',
     'auth_header', 'Authorization',
     'auth_token', '',
     'timeout_ms', 30000
   ), false)
ON CONFLICT (lower(code)) DO NOTHING;

-- Global settings ---------------------------------------------------------------
INSERT INTO settings (key, value) VALUES
  ('console.site_name', '"Kids AI Console"'::jsonb),
  ('console.max_memories_per_device', '100'::jsonb),
  ('mcp.default_timeout_ms', '30000'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Demo device (belongs to the demo user) ----------------------------------------
-- Storyteller role, memory feature enabled, a couple of sample memories.
INSERT INTO devices (user_id, device_code, device_name, model, firmware_version, role_id, status)
SELECT u.id,
       'AA:BB:CC:DD:EE:01',
       'Nursery Speaker',
       'ESP32-S3 Box',
       '1.0.4',
       (SELECT id FROM roles WHERE name = 'Storyteller' AND user_id IS NULL),
       'active'
FROM users u
WHERE u.email = 'user@kids-ai.local'
ON CONFLICT (lower(device_code)) DO NOTHING;

INSERT INTO device_features (device_id, feature_id, enabled, enabled_at)
SELECT d.id, f.id, true, now()
FROM devices d
JOIN features f ON f.code = 'memory'
WHERE d.device_code = 'AA:BB:CC:DD:EE:01'
ON CONFLICT (device_id, feature_id) DO NOTHING;

INSERT INTO memories (device_id, content)
SELECT d.id, m.content
FROM devices d
JOIN (VALUES
  ('Likes the story of Timun Mas, especially the part with Buto Ijo.'),
  ('Favorite color is green; wants a green robot for their birthday.')
) AS m(content) ON true
WHERE d.device_code = 'AA:BB:CC:DD:EE:01'
  AND NOT EXISTS (
    SELECT 1 FROM memories existing
    WHERE existing.device_id = d.id AND existing.content = m.content
  );
