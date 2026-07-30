-- ============================================================
-- Art Reflection — Supabase テーブル定義
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

create table if not exists surveys (
    id              bigint        generated always as identity primary key,
    artwork_id      text,                        -- 匿名の作品ID
    workshop_session text,                       -- 匿名のセッションID
    score_expressed  smallint check (score_expressed  between 1 and 5),
    score_attachment smallint check (score_attachment between 1 and 5),
    score_involvement smallint check (score_involvement between 1 and 5),
    score_ai_helped  smallint check (score_ai_helped  between 1 and 5),
    score_again      smallint check (score_again      between 1 and 5),
    emotion_before   text,
    emotion_after    text,
    free_text        text,
    answered_at      timestamptz   not null default now()
);

-- 個人を特定する列は一切含めない（IP・メール・名前等は保存しない）
-- RLS（Row Level Security）: 書き込みは誰でも可、読み取りは anon key で可
alter table surveys enable row level security;

-- INSERT: 誰でも可（フロントエンドからの投稿用）
create policy "allow_insert" on surveys
    for insert to anon with check (true);

-- SELECT: 誰でも可（管理画面での集計用）
-- ※ 本番では管理者のみに絞ることを推奨
create policy "allow_select" on surveys
    for select to anon using (true);
