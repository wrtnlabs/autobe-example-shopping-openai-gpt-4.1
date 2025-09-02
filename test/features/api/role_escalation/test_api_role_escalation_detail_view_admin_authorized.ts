import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendRoleEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendRoleEscalation";

export async function test_api_role_escalation_detail_view_admin_authorized(
  connection: api.IConnection,
) {
  /**
   * Test: Admin retrieves details of a specific role escalation event.
   *
   * This test proves that audit transparency and privileged access to role
   * escalation evidences is enforced: only an authenticated admin can request
   * and receive the complete data for a given role escalation event. This is
   * essential for both compliance (regulatory traceability) and business
   * operations (dispute resolution, risk management).
   *
   * Steps:
   *
   * 1. Register a new admin to authenticate API calls
   * 2. Simulate or locate a target role escalation event's ID (simulate as we lack
   *    a create API)
   * 3. As the authenticated admin, request detail view of the escalation event
   * 4. Assert all business-critical properties and evidence fields are visible and
   *    type-correct
   *
   * Prerequisites: The scenario assumes the system is either seeded with test
   * escalation events or the test framework's simulation/mocking allows random
   * role escalation IDs for demonstration purposes.
   */

  // 1. Admin registration and authentication
  const adminUsername: string = RandomGenerator.alphabets(8);
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();
  const adminEmail: string = `${RandomGenerator.alphabets(6)}@test.internal`;
  const adminPhone: string = RandomGenerator.mobile();

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username matched after join",
    adminAuth.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matched after join",
    adminAuth.admin.email,
    adminEmail,
  );
  TestValidator.equals("admin is enabled", adminAuth.admin.is_active, true);

  // 2. Simulate or pick an escalation event ID (no direct create API exists)
  const simulatedEscalation: IShoppingMallAiBackendRoleEscalation =
    typia.random<IShoppingMallAiBackendRoleEscalation>();
  typia.assert(simulatedEscalation);
  const escalationId = simulatedEscalation.id;

  // 3. Admin requests event detail by ID
  const event =
    await api.functional.shoppingMallAiBackend.admin.roleEscalations.at(
      connection,
      {
        roleEscalationId: escalationId as string & tags.Format<"uuid">,
      },
    );
  typia.assert(event);

  // 4. Validate all business evidence and audit details exist and are correctly typed
  TestValidator.equals("escalation ID is correct", event.id, escalationId);
  TestValidator.predicate(
    "user_id is a non-empty string",
    typeof event.user_id === "string" && event.user_id.length > 0,
  );
  TestValidator.predicate(
    "from_role is a non-empty string",
    typeof event.from_role === "string" && event.from_role.length > 0,
  );
  TestValidator.predicate(
    "to_role is a non-empty string",
    typeof event.to_role === "string" && event.to_role.length > 0,
  );
  TestValidator.predicate(
    "type field is a non-empty string",
    typeof event.escalation_type === "string" &&
      event.escalation_type.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid ISO string",
    typeof event.created_at === "string" &&
      !isNaN(Date.parse(event.created_at)),
  );
  // Reason and admin_id may be nullable
  TestValidator.predicate(
    "if present, reason is string or null",
    event.reason === undefined ||
      typeof event.reason === "string" ||
      event.reason === null,
  );
  TestValidator.predicate(
    "if present, admin_id is string or null",
    event.admin_id === undefined ||
      typeof event.admin_id === "string" ||
      event.admin_id === null,
  );
}
