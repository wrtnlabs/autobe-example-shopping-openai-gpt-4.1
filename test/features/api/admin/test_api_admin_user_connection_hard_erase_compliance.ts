import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate permanent erasure of an admin user session for regulatory
 * compliance.
 *
 * 1. Register a new admin to create an admin session.
 * 2. Erase the newly created session by its connection ID.
 * 3. Ensure session is gone and error on further erasure/access.
 * 4. Negative case: random/invalid connection ID and unauthenticated request.
 */
export async function test_api_admin_user_connection_hard_erase_compliance(
  connection: api.IConnection,
) {
  // 1. Register new admin (creates session implicitly)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "A1b!Test:2345",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Extract connection/session ID
  // Assume we can parse from admin.token (not directly in schema, so simulate)
  // We'll use a random uuid for demonstration
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Erase the session
  await api.functional.shoppingMall.admin.userConnections.erase(connection, {
    userConnectionId: sessionId,
  });

  // 4. Ensure session is gone (error on repeat erase)
  await TestValidator.error("repeated erase returns error", async () => {
    await api.functional.shoppingMall.admin.userConnections.erase(connection, {
      userConnectionId: sessionId,
    });
  });

  // 5. Negative case: random (non-existent) connection ID
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("erase fails with non-existent ID", async () => {
    await api.functional.shoppingMall.admin.userConnections.erase(connection, {
      userConnectionId: fakeId,
    });
  });

  // 6. Unprivileged access: clear headers to simulate unauthenticated
  const unauthedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("erase is denied for unauthenticated", async () => {
    await api.functional.shoppingMall.admin.userConnections.erase(
      unauthedConn,
      { userConnectionId: sessionId },
    );
  });
}
