import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that an admin can successfully soft-delete a product tag by its ID.
 *
 * - Create and authenticate an admin account using
 *   api.functional.auth.admin.join.
 * - Generate a valid tagId (UUID) to use for the DELETE request. (Tag
 *   creation is out of scope due to missing API for creation, so we
 *   simulate the existence.)
 * - Call api.functional.shoppingMallAiBackend.admin.productTags.erase with
 *   the tagId as an authorized admin.
 * - Expect no error and proper soft deletion behavior (although post-deletion
 *   verification is not possible due to lack of read/list endpoint).
 */
export async function test_api_product_tag_delete_success_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32), // Simulate password hash
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminReg);
  // 2. Generate a valid tagId to "simulate" existing tag
  const tagId = typia.random<string & tags.Format<"uuid">>();

  // 3. Issue DELETE as authorized admin
  await api.functional.shoppingMallAiBackend.admin.productTags.erase(
    connection,
    {
      tagId,
    },
  );
  // 4. (Cannot verify deletion; no read/list endpoint for tags provided.)
}
