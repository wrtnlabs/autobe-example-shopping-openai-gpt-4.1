import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_inquiry_reply_delete_admin_success(
  connection: api.IConnection,
) {
  /**
   * Test admin privilege for logical (soft) deletion of an inquiry reply.
   *
   * Purpose & Rationale:
   *
   * - Validates that an admin can delete (soft/logic delete) any reply to an
   *   inquiry, regardless of the original reply author (customer/seller or
   *   otherwise).
   * - Ensures permissioning allows DELETE for admins and that operation succeeds.
   * - Audit log and deleted_at write are system-side; test is to verify API
   *   contract enforcement and that no error occurs under admin context.
   *
   * Steps:
   *
   * 1. Register a new admin and authenticate (establish Authorization header).
   * 2. Simulate target inquiry/reply IDs (random UUIDs), as creation/seed API is
   *    missing.
   * 3. Invoke the DELETE endpoint as admin with those IDs.
   * 4. Assert that operation completes with no error (success) as confirmation.
   * 5. Note: Further content/audit checks would require system DB or read
   *    endpoints.
   */

  // 1. Register admin and authenticate
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.test`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Simulate existing inquiry and reply IDs (no create API available)
  const inquiryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const replyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. DELETE reply as admin (soft delete)
  await api.functional.shoppingMallAiBackend.admin.inquiries.replies.erase(
    connection,
    {
      inquiryId,
      replyId,
    },
  );

  // 4. Confirmation: If we reach here, no error implies success (void-return)
}
