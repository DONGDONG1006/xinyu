-- ============================================================
-- 甘肃新煜科技工作台 · Supabase 数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================================

-- 1. 创建主数据表（存储共享数据库）
CREATE TABLE IF NOT EXISTS workbench_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB,
  version INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 插入初始行（首次部署时）
INSERT INTO workbench_data (id, data, version)
VALUES (1, '{}'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. 创建在线状态表
CREATE TABLE IF NOT EXISTS presence (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  ts BIGINT
);

-- 4. 启用 Row Level Security
ALTER TABLE workbench_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- 5. 允许匿名读写（anon key 即可访问，适合内部使用）
CREATE POLICY "allow_all_workbench" ON workbench_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_presence" ON presence FOR ALL USING (true) WITH CHECK (true);

-- 6. 启用实时同步（关键！开启后数据变更会通过 WebSocket 推送到所有设备）
ALTER PUBLICATION supabase_realtime ADD TABLE workbench_data;
ALTER PUBLICATION supabase_realtime ADD TABLE presence;

-- 完成！现在可以在工作台管理后台填入 Supabase URL 和 anon key 了。
