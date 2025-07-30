import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate customer support ticket listing returns only the authenticated
 * user's tickets and all required fields.
 *
 * Business context: Customers should only see support tickets they created, not
 * those of others, regardless of ticket status (open, resolved, etc). This
 * ensures privacy and proper access control, as well as the completeness of
 * ticket metadata for dashboard or audit display.
 *
 * Steps:
 *
 * 1. Create multiple support tickets for the authenticated customer, with varying
 *    priority and category fields.
 * 2. Retrieve the support ticket list for the current customer.
 * 3. Ensure the created tickets are present in the list, properly attributed, and
 *    with all key fields.
 * 4. (If possible) Edge check: Tickets by other users do not appear in listing
 *    (skipped here as authentication/user switching is not specified in
 *    available API set).
 */
export async function test_api_aimall_backend_customer_supportTickets_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate random ticket data with varying attributes
  const requester_id = typia.random<string & tags.Format<"uuid">>();
  const subject1 = RandomGenerator.paragraph()();
  const subject2 = RandomGenerator.paragraph()();
  const ticket1 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id,
          subject: subject1,
          body: RandomGenerator.content()()(),
          priority: "high",
          category: "delivery",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket1);

  const ticket2 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id,
          subject: subject2,
          body: RandomGenerator.content()()(),
          priority: "normal",
          category: "payment",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket2);

  // 2. Retrieve list of tickets for this customer
  const indexResult =
    await api.functional.aimall_backend.customer.supportTickets.index(
      connection,
    );
  typia.assert(indexResult);

  // 3. Confirm both created tickets are present and with correct fields
  for (const expected of [ticket1, ticket2]) {
    const actual = indexResult.data.find((t) => t.id === expected.id);

    TestValidator.predicate("Customer ticket returned from index")(!!actual);
    TestValidator.equals("Customer ticket requester_id")(actual?.requester_id)(
      expected.requester_id,
    );
    TestValidator.equals("Customer ticket subject")(actual?.subject)(
      expected.subject,
    );
    TestValidator.equals("Customer ticket body")(actual?.body)(expected.body);
    TestValidator.equals("Customer ticket priority")(actual?.priority)(
      expected.priority,
    );
    TestValidator.equals("Customer ticket category")(actual?.category)(
      expected.category,
    );
    TestValidator.predicate("Status field is string")(
      typeof actual?.status === "string",
    );
    TestValidator.predicate("Timestamps exist")(
      !!actual?.created_at && !!actual?.updated_at,
    );
  }
}
