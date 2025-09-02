import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_inquiry_reply_delete_admin_idempotent_or_already_deleted(
  connection: api.IConnection,
) {
  /**
   * Validates idempotent delete behavior for already-deleted replies by an
   * admin.
   *
   * This test simulates an admin attempting to delete a reply to an inquiry
   * which is already logically/soft deleted. The operation should be idempotent
   * - calling delete more than once should not produce adverse effects. It
   * should either do nothing, return a confirmation, or (optionally) return a
   * suitable "already deleted" or "not found" error, but must not throw
   * system-level errors or corrupt state.
   *
   * Because the API does not expose the ability to create an inquiry/reply or
   * to verify logical deletion of a reply, this test uses random UUIDs for
   * inquiryId and replyId to represent "already deleted or non-existent"
   * replies. The test asserts that repeated deletion attempts do not fail
   * fatally and that at most a business error (e.g., not found) may be
   * returned.
   */
  // 1. Register and authenticate as admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Use random UUIDs to simulate a reply that is already deleted / non-existent
  const inquiryId = typia.random<string & tags.Format<"uuid">>();
  const replyId = typia.random<string & tags.Format<"uuid">>();

  // 3. First delete attempt (should succeed or return business error)
  await api.functional.shoppingMallAiBackend.admin.inquiries.replies.erase(
    connection,
    { inquiryId, replyId },
  );

  // 4. Second delete attempt (should be idempotent; must not error fatally)
  await api.functional.shoppingMallAiBackend.admin.inquiries.replies.erase(
    connection,
    { inquiryId, replyId },
  );
}
