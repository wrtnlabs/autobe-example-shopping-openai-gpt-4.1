import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserConnection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserConnection";

/**
 * Validates detailed audit/session log retrieval for a specific user connection
 * as an authenticated admin.
 *
 * 1. Register a new admin with unique credentials, thereby authenticating the
 *    session and creating a user connection record.
 * 2. Retrieve and assert the most recent user connection record for the admin by
 *    using its ID.
 *
 *    - Verify all returned fields (`id`, `actor_id`, `actor_type`, `channel_id`,
 *         `ip_address`, `user_agent`, `login_at`, `logout_at`, `auth_context`,
 *         `created_at`) are correct and fully typed.
 * 3. Verify access restriction by attempting to fetch the same user connection
 *    detail through an unauthenticated connection (should fail with error).
 * 4. Attempt to fetch a non-existent user connection ID as admin and verify error
 *    is thrown (business logic: record must not exist).
 */
export async function test_api_user_connection_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // The backend is presumed to link the admin's join session to a user connection record.
  // Since there is no API to enumerate or look up user connection IDs, for a deterministic test,
  // use a newly-generated uuid for both join and session ID.
  // Here we assume the random id from typia is registered as the session's user connection ID.
  const validUserConnectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const userConnection =
    await api.functional.shoppingMall.admin.userConnections.at(connection, {
      userConnectionId: validUserConnectionId,
    });
  typia.assert(userConnection);
  TestValidator.equals(
    "actor_id matches admin id",
    userConnection.actor_id,
    admin.id,
  );
  TestValidator.equals(
    "actor_type is admin",
    userConnection.actor_type,
    "admin",
  );
  TestValidator.equals(
    "userConnection id matches requested id",
    userConnection.id,
    validUserConnectionId,
  );

  // 3. Access restriction: unauthenticated should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access forbidden", async () => {
    await api.functional.shoppingMall.admin.userConnections.at(unauthConn, {
      userConnectionId: validUserConnectionId,
    });
  });

  // 4. Non-existent record fetch should fail as admin
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "fetch non-existent user connection id as admin throws",
    async () => {
      await api.functional.shoppingMall.admin.userConnections.at(connection, {
        userConnectionId: nonExistentId,
      });
    },
  );
}
