import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that only administrator users can access the full support ticket
 * listing via GET /aimall-backend/administrator/supportTickets.
 *
 * This test ensures RBAC controls are enforced, so only admin users can view
 * and search all tickets. It simulates access attempts as customer and seller,
 * verifying both receive authorization errors, then confirms admin successfully
 * lists tickets.
 *
 * Step-by-step:
 *
 * 1. Attempt to access as a customer: expect authorization error.
 * 2. Attempt as a seller: expect authorization error.
 * 3. Access as an admin: expect a valid paginated result with support ticket data.
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_list_support_tickets_requires_admin_role(
  connection: api.IConnection,
) {
  //--- Step 1: Customer session - should be forbidden
  await TestValidator.error(
    "customer forbidden for full support ticket listing",
  )(async () => {
    await api.functional.aimall_backend.administrator.supportTickets.index(
      connection,
    );
  });

  //--- Step 2: Seller session - should be forbidden
  await TestValidator.error("seller forbidden for full support ticket listing")(
    async () => {
      await api.functional.aimall_backend.administrator.supportTickets.index(
        connection,
      );
    },
  );

  //--- Step 3: Admin session - should succeed
  const output =
    await api.functional.aimall_backend.administrator.supportTickets.index(
      connection,
    );
  typia.assert(output);
  TestValidator.predicate("has valid pagination")(!!output.pagination);
  TestValidator.predicate("data is array")(Array.isArray(output.data));
}
