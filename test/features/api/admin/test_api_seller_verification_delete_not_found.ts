import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_verification_delete_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate not-found error when deleting a seller verification record with
   * random (non-existent) IDs.
   *
   * 1. Create and login a new admin to ensure admin-permission context.
   * 2. Attempt to delete a seller verification using random UUIDs for sellerId and
   *    verificationId.
   * 3. Confirm API responds with a NotFound-style error (commonly HTTP 404 or
   *    similar), validating the backend enforces existence or audit
   *    guarantees.
   *
   * This scenario covers the negative path for admin deletion of seller
   * verification: the system must prevent deletion of entities that don't exist
   * and properly signal an error rather than silent no-op. It is essential to
   * test for both integrity and audit trail completeness.
   */
  // 1. Register and login as admin
  const adminUsername: string = RandomGenerator.alphabets(10);
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPassword,
        name: RandomGenerator.name(),
        email: `${RandomGenerator.alphabets(8)}@systest.local`,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt deletion for random UUIDs (simulate not-found scenario)
  await TestValidator.error(
    "delete non-existent seller verification returns error (not found)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.verifications.erase(
        connection,
        {
          sellerId: typia.random<string & tags.Format<"uuid">>(),
          verificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
