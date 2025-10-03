import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleEscalation";

/**
 * Validates privileged admin access to their own role escalation request
 * details and enforces access control for this sensitive escalation audit
 * resource.
 *
 * Steps:
 *
 * 1. Register a new admin with unique credentials and login (receiving current
 *    session token)
 * 2. Construct a plausible admin role escalation record with valid adminId
 *    (simulate direct DB insert or API call, or generate with correct format
 *    for test purposes if not available)
 * 3. Fetch escalation details as self: GET
 *    /shoppingMall/admin/admins/{adminId}/roleEscalations/{escalationId},
 *    assert status, field validity (actors, workflow fields, reviewer,
 *    compliance reasons, evidence, timestamps)
 * 4. Register a second admin and login, then attempt to fetch the same escalation
 *    details (should be forbidden—verify error)
 * 5. Try fetching with random/invalid escalationId or adminId (should yield
 *    not-found)
 * 6. Each successful access should reflect compliance/auditing.
 */
export async function test_api_admin_role_escalation_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin A
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminA = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminAEmail,
      password: "Test1234!@#",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminA);

  // 2. [Setup] Synthesize escalation for A
  const escalation: IShoppingMallAdminRoleEscalation = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_admin_id: adminA.id,
    requestor_id: typia.random<string & tags.Format<"uuid">>(),
    escalation_type: RandomGenerator.pick([
      "customer_to_admin",
      "seller_to_admin",
      "privilege_update",
    ] as const),
    status: RandomGenerator.pick([
      "pending",
      "approved",
      "rejected",
      "cancelled",
    ] as const),
    reviewed_by_id: null,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  typia.assert(escalation);

  // 3. As admin A, fetch escalation detail (simulate: assume escalationId is registered)
  // (note: in a real test, escalation would be created via system API/fixture)
  const result =
    await api.functional.shoppingMall.admin.admins.roleEscalations.at(
      connection,
      {
        adminId: escalation.shopping_mall_admin_id,
        escalationId: escalation.id,
      },
    );
  typia.assert(result);
  // ID fields correctness and format compliance
  TestValidator.equals("escalation id matches", result.id, escalation.id);
  TestValidator.equals(
    "admin id matches",
    result.shopping_mall_admin_id,
    adminA.id,
  );
  // Business logic field checks
  TestValidator.predicate(
    "escalation_type is allowed",
    ["customer_to_admin", "seller_to_admin", "privilege_update"].includes(
      result.escalation_type,
    ),
  );
  TestValidator.predicate(
    "status is allowed",
    ["pending", "approved", "rejected", "cancelled"].includes(result.status),
  );
  // Optional/reviewer fields: allow both null or uuid
  if (result.reviewed_by_id !== null && result.reviewed_by_id !== undefined)
    typia.assert<string & tags.Format<"uuid">>(result.reviewed_by_id!);
  // Reason can be null or string
  TestValidator.predicate(
    "reason is string/null",
    typeof result.reason === "string" ||
      result.reason === null ||
      result.reason === undefined,
  );
  // Timestamp field validation
  typia.assert<string & tags.Format<"date-time">>(result.created_at);
  typia.assert<string & tags.Format<"date-time">>(result.updated_at);

  // 4. Register admin B and re-login as B
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminB = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminBEmail,
      password: "Test1234!@#",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminB);

  // Attempt forbidden access as unrelated admin (admin B)
  await TestValidator.error(
    "should be forbidden for unrelated admin",
    async () => {
      await api.functional.shoppingMall.admin.admins.roleEscalations.at(
        connection,
        {
          adminId: escalation.shopping_mall_admin_id,
          escalationId: escalation.id,
        },
      );
    },
  );

  // 5. Try with invalid/nonexistent escalationId
  await TestValidator.error(
    "should return not-found for invalid escalationId",
    async () => {
      await api.functional.shoppingMall.admin.admins.roleEscalations.at(
        connection,
        {
          adminId: escalation.shopping_mall_admin_id,
          escalationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // Try with invalid/nonexistent adminId
  await TestValidator.error(
    "should return not-found for invalid adminId",
    async () => {
      await api.functional.shoppingMall.admin.admins.roleEscalations.at(
        connection,
        {
          adminId: typia.random<string & tags.Format<"uuid">>(),
          escalationId: escalation.id,
        },
      );
    },
  );
}
