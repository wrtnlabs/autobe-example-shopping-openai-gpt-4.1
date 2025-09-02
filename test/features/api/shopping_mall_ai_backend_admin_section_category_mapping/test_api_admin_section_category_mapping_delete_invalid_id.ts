import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_section_category_mapping_delete_invalid_id(
  connection: api.IConnection,
) {
  /**
   * Test error handling when deleting section-category mapping with an invalid
   * mappingId as admin.
   *
   * 1. Register a new admin account to establish admin authentication context for
   *    protected DELETE operation.
   * 2. Attempt to delete a section-category mapping using random UUIDs for
   *    sectionId and mappingId (guaranteed to not exist).
   * 3. Verify that the API returns an HTTP 404 Not Found error (not-found), and no
   *    record is removed or affected.
   *
   * This ensures the endpoint strictly enforces resource existence checks and
   * returns clear errors for invalid delete attempts.
   */
  // 1. Register and authenticate admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(40),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Attempt to delete using invalid IDs and expect HTTP 404 error
  await TestValidator.httpError(
    "attempt to delete mapping with invalid sectionId/mappingId should return 404",
    404,
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.erase(
        connection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          mappingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
