import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test admin can soft delete section-category mapping by mappingId.
 *
 * 1. Admin registers via /auth/admin/join.
 * 2. Admin attempts to erase a section-category mapping (simulate real
 *    mapping).
 * 3. API should result in (void) success if mapping existed, but since we do
 *    not have creation/list API, this represents a simulation/mock
 *    deletion.
 * 4. Try deletion with an invalid mappingId (simulate failure - likely 404).
 * 5. Try deletion with non-existent mapping (again, different random UUIDs for
 *    mappingId/sectionId).
 * 6. Error case for insufficient permissions cannot be simulated as only admin
 *    join is possible within current API surface.
 */
export async function test_api_admin_section_category_mapping_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminInput = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);

  // 2. Attempt to erase a (pretend) existing mapping
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const mappingId = typia.random<string & tags.Format<"uuid">>();

  await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.erase(
    connection,
    {
      sectionId,
      mappingId,
    },
  );
  // No response is expected (void)

  // 3. Error: invalid mappingId
  await TestValidator.error(
    "invalid mappingId should fail erase (simulate missing resource)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sections.categoryMappings.erase(
        connection,
        {
          sectionId,
          mappingId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 4. Error: non-existent mapping (new random UUIDs)
  await TestValidator.error(
    "non-existent mappingId should fail erase (simulate missing resource)",
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
