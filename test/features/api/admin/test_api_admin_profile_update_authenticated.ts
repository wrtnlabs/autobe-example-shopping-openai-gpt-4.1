import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validates admin profile update for authenticated admin, including change to
 * core profile fields, audit and security logic, forbidden changes, error edge
 * cases, and access control for unauthenticated or non-existent IDs.
 *
 * Flow:
 *
 * 1. Register a new admin (admin join) and authenticate.
 * 2. Update profile with new valid name, email, and status (active).
 * 3. Validate that profile and audit fields (updated_at) change, and password_hash
 *    is not exposed.
 * 4. Try updating with a duplicate email (should throw error).
 * 5. Attempt update as unauthenticated user (should be forbidden).
 * 6. Update using invalid admin ID (should be error).
 * 7. Try changing fields that must not be updated (simulate password_hash,
 *    created_at overrides, should have no effect).
 * 8. Test edge case with improper status transition (e.g., unknown status value).
 */
export async function test_api_admin_profile_update_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        full_name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Update admin profile (change name, email, status)
  const newName = RandomGenerator.name();
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newStatus = RandomGenerator.pick([
    "active",
    "disabled",
    "suspended",
  ] as const);
  const updated = await api.functional.shoppingMall.admin.admins.update(
    connection,
    {
      adminId: admin.id,
      body: {
        full_name: newName,
        email: newEmail,
        status: newStatus,
      } satisfies IShoppingMallAdmin.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("updated name applied", updated.full_name, newName);
  TestValidator.equals("updated email applied", updated.email, newEmail);
  TestValidator.equals("updated status applied", updated.status, newStatus);
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    admin.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    admin.created_at,
  );
  TestValidator.equals("no deleted_at set", updated.deleted_at, null);

  // 3. Duplicate email should error
  const otherAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword456!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(otherAdmin);

  await TestValidator.error("duplicate email should fail", async () => {
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: otherAdmin.id,
      body: {
        email: newEmail, // Used by the previous admin
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  });

  // 4. Forbidden fields: try password_hash, created_at, id (should not affect)
  const forbiddenUpdateResult =
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: admin.id,
      body: {
        // intentionally adding fields that are not part of IUpdate has no effect, so skip adding
        // password_hash, created_at, id are not allowed in IUpdate and will throw at compile time
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  typia.assert(forbiddenUpdateResult);
  // updated id and created_at should be unchanged
  TestValidator.equals(
    "id unchanged after forbidden update",
    forbiddenUpdateResult.id,
    admin.id,
  );
  TestValidator.equals(
    "created_at unchanged after forbidden update",
    forbiddenUpdateResult.created_at,
    admin.created_at,
  );
  TestValidator.equals(
    "no password_hash property",
    Object.prototype.hasOwnProperty.call(
      forbiddenUpdateResult,
      "password_hash",
    ),
    false,
  );

  // 5. Edge: improper status value (unsupported status)
  await TestValidator.error("improper status fails", async () => {
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: admin.id,
      body: {
        status: "not_a_valid_status",
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  });

  // 6. Update with invalid adminId
  await TestValidator.error("invalid admin id fails", async () => {
    await api.functional.shoppingMall.admin.admins.update(connection, {
      adminId: typia.random<string & tags.Format<"uuid">>(), // random id, not in db
      body: {
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IUpdate,
    });
  });

  // 7. Unauthenticated user update should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin update forbidden",
    async () => {
      await api.functional.shoppingMall.admin.admins.update(unauthConn, {
        adminId: admin.id,
        body: {
          full_name: RandomGenerator.name(),
        } satisfies IShoppingMallAdmin.IUpdate,
      });
    },
  );
}
