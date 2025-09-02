import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_account_soft_delete_and_restricted_access_post_deletion(
  connection: api.IConnection,
) {
  /**
   * Validates soft deletion of an admin account and enforces post-deletion
   * business restrictions.
   *
   * The test covers the regulatory and audit requirement that soft-deleted
   * admins become inaccessible for authentication and business functions, while
   * audit evidence (deleted_at) is preserved.
   *
   * Workflow:
   *
   * 1. Register a new admin account (unique username/email, simulated password
   *    hash)
   * 2. Confirm joined admin is active and undeleted
   * 3. Soft delete the admin's own account (sets deleted_at)
   * 4. Attempt to login as the deleted admin, expecting rejection
   * 5. Validate all operations with strict assertions and clear titles
   *
   * (Note: If direct admin profile query becomes available post-deletion, also
   * assert deleted_at is set. Currently not implemented due to endpoint
   * unavailability.)
   */
  // 1. Register admin
  const uniqueValue = RandomGenerator.alphaNumeric(12);
  const adminUsername = `admin_${uniqueValue}`;
  const adminEmail = `${uniqueValue}@business-domain.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(20);

  const registration = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(registration);
  TestValidator.predicate(
    "joined admin account is active and undeleted",
    registration.admin.is_active === true &&
      (registration.admin.deleted_at === null ||
        registration.admin.deleted_at === undefined),
  );
  TestValidator.equals(
    "admin username matches input",
    registration.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches input",
    registration.admin.email,
    adminEmail,
  );

  // 2. Soft delete admin (self-delete)
  await api.functional.shoppingMallAiBackend.admin.admins.erase(connection, {
    adminId: registration.admin.id,
  });

  // 3. Attempt to login with deleted admin - must fail
  await TestValidator.error(
    "login is rejected for soft-deleted admin account",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          username: adminUsername,
          password: adminPasswordHash, // Simulate password == used hash for test
        } satisfies IShoppingMallAiBackendAdmin.ILogin,
      });
    },
  );
  // (No public endpoint to validate deleted_at in profile after deletion)
}
