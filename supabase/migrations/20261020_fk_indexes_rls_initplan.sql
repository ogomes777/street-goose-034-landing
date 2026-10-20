-- SET77 LABS / STREET GOOSE 034
-- Applied to production Supabase via managed migration on 2026-10-20.
-- Idempotent source mirror for disaster recovery and future environments.
-- No policy roles/commands changed, only auth.uid() initplans.
create index if not exists sg_admin_audit_log_user_id_idx on public.admin_audit_log (user_id);
create index if not exists sg_community_posts_moderated_by_idx on public.community_posts (moderated_by);
create index if not exists sg_community_posts_user_id_idx on public.community_posts (user_id);
create index if not exists sg_finance_entries_created_by_idx on public.finance_entries (created_by);
create index if not exists sg_notification_campaigns_created_by_idx on public.notification_campaigns (created_by);
create index if not exists sg_order_items_order_id_idx on public.order_items (order_id);
create index if not exists sg_orders_created_by_idx on public.orders (created_by);
create index if not exists sg_orders_user_id_idx on public.orders (user_id);
create index if not exists sg_product_prices_updated_by_idx on public.product_prices (updated_by);
create index if not exists sg_products_updated_by_idx on public.products (updated_by);
create index if not exists sg_push_delivery_jobs_subscription_id_idx on public.push_delivery_jobs (subscription_id);
create index if not exists sg_push_subscriptions_user_id_idx on public.push_subscriptions (user_id);
create index if not exists sg_reward_redemptions_reward_id_idx on public.reward_redemptions (reward_id);
create index if not exists sg_rewards_requirement_level_idx on public.rewards (requirement_level);
alter policy "profiles: user reads own" on public.profiles using ((select auth.uid()) = id);
alter policy "profiles: user updates own" on public.profiles using ((select auth.uid()) = id);
alter policy "profiles: user inserts own" on public.profiles with check ((select auth.uid()) = id);
alter policy "favorites: user manages own" on public.favorites using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "cart_items: user manages own" on public.cart_items using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "orders: user reads own" on public.orders using ((select auth.uid()) = user_id);
alter policy "order_items: user reads own via order" on public.order_items using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = (select auth.uid())));
alter policy "xp_ledger: user reads own" on public.xp_ledger using ((select auth.uid()) = user_id);
alter policy "reward_redemptions: user reads own" on public.reward_redemptions using ((select auth.uid()) = user_id);
alter policy "community_posts: user reads own regardless of status" on public.community_posts using ((select auth.uid()) = user_id);
alter policy "community_posts: user deletes own" on public.community_posts using ((select auth.uid()) = user_id);
alter policy "community_posts: user inserts own" on public.community_posts with check (((select auth.uid()) = user_id) and status = 'pending' and moderated_at is null and rejection_reason is null);
