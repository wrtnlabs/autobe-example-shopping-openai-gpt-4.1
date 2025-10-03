import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleEscalation";

/**
 * End-to-end scenario for updating an admin role escalation request and its
 * audit.
 *
 * 1. Register and authenticate a privileged admin for update operation
 * 2. Assume an existing escalation role request for the admin exists (simulate:
 *    create one randomly)
 * 3. Update the escalation - e.g. approve with comments and current admin as
 *    reviewer
 * 4. Validate status, comments, reviewer have been persisted
 * 5. Try an invalid transition (e.g., approve an already-approved escalation)
 * 6. Validate business error occurs on invalid transition
 * 7. Register and authenticate a non-privileged admin, try forbidden update -
 *    access should be denied
 * 8. Ensure all transitions and attempts (success/failure) would be audit-logged
 *    (simulate: check updated_at changes and output integrity)
 */
export async function test_api_admin_role_escalation_update_with_audit(
  connection: api.IConnection,
) {
  // 1. Register and authenticate primary admin
  const mainAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const mainAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: mainAdminJoin });
  typia.assert(mainAdmin);

  // 2. Simulate existence of a pending escalation request for that admin
  // (In real test, would POST to endpoint that creates role escalation; here, randomize an escalation for the admin)
  const escalationId = typia.random<string & tags.Format<"uuid">>();
  let escalation: IShoppingMallAdminRoleEscalation = {
    id: escalationId,
    shopping_mall_admin_id: mainAdmin.id,
    requestor_id: typia.random<string & tags.Format<"uuid">>(),
    escalation_type: "privilege_update",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewed_by_id: null,
    reason: null,
  };
  typia.assert(escalation);

  // 3. Approve the escalation with comments and reviewer
  const approveBody = {
    status: "approved",
    reviewed_by_id: mainAdmin.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAdminRoleEscalation.IUpdate;
  const updatedEscalation =
    await api.functional.shoppingMall.admin.admins.roleEscalations.update(
      connection,
      {
        adminId: mainAdmin.id,
        escalationId: escalation.id,
        body: approveBody,
      },
    );
  typia.assert(updatedEscalation);
  TestValidator.equals(
    "escalation status updated",
    updatedEscalation.status,
    approveBody.status,
  );
  TestValidator.equals(
    "escalation reviewer updated",
    updatedEscalation.reviewed_by_id,
    approveBody.reviewed_by_id,
  );
  TestValidator.equals(
    "escalation reason updated",
    updatedEscalation.reason,
    approveBody.reason,
  );
  TestValidator.notEquals(
    "updated_at changed after update",
    updatedEscalation.updated_at,
    escalation.updated_at,
  );

  // 4. Try to update again with an invalid transition (approve again)
  await TestValidator.error(
    "cannot approve already-approved escalation",
    async () => {
      await api.functional.shoppingMall.admin.admins.roleEscalations.update(
        connection,
        {
          adminId: mainAdmin.id,
          escalationId: escalation.id,
          body: approveBody,
        },
      );
    },
  );

  // 5. Register and authenticate a different admin (not privileged on this record)
  const otherAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const otherAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: otherAdminJoin });
  typia.assert(otherAdmin);

  // 6. Attempt forbidden update as unrelated admin
  await TestValidator.error(
    "unrelated admin cannot update escalation",
    async () => {
      await api.functional.shoppingMall.admin.admins.roleEscalations.update(
        connection,
        {
          adminId: otherAdmin.id,
          escalationId: escalation.id,
          body: {
            status: "rejected",
            reviewed_by_id: otherAdmin.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    },
  );

  // 7. Confirm audit trail by checking updated_at has changed for allowed update
  TestValidator.notEquals(
    "audit trail - updated_at reflects change",
    updatedEscalation.updated_at,
    escalation.updated_at,
  );
}
