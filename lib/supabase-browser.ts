"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client phía trình duyệt — SINGLETON, dựng một lần cho cả tab.
 * (Dựng client mới mỗi lần gọi thì không ai giữ session để đọc — lỗi từng làm
 * trang đặt lại mật khẩu "bấm mãi không thấy gì".)
 */
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
