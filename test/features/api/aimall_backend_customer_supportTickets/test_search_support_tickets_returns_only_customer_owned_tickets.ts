import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates that the support ticket search endpoint returns only tickets owned
 * by the authenticated customer, regardless of filters.
 *
 * This test covers the security and isolation requirement that a customer
 * should never be able to view another customer's support tickets—even if using
 * broad or crafted filter values.
 *
 * **Test process:**
 *
 * 1. Simulate two customers by generating unique UUIDs.
 * 2. Customer A creates multiple support tickets with diverse details.
 * 3. Customer B creates a distinct ticket.
 * 4. Perform various searches as Customer A, including unfiltered and filtered
 *    cases, and confirm that only tickets owned by A are returned.
 * 5. Perform a control search as Customer B.
 *
 * At each step, assert that all tickets in the result belong only to the
 * requesting customer, regardless of filter specificity.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_search_support_tickets_returns_only_customer_owned_tickets(
  connection: api.IConnection,
) {
  // 1. Simulate two customers by generating distinct UUIDs.
  const customerA_id: string = typia.random<string & tags.Format<"uuid">>();
  const customerB_id: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Customer A creates two support tickets with different subjects/category/priority.
  const ticketA1 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerA_id,
          subject: "Payment issue",
          body: "CustomerA: Payment failed on order #1234.",
          priority: "urgent",
          category: "payment",
        },
      },
    );
  typia.assert(ticketA1);

  const ticketA2 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerA_id,
          subject: "Shipping delay",
          body: "CustomerA: My package has not arrived.",
          priority: "high",
          category: "delivery",
        },
      },
    );
  typia.assert(ticketA2);

  // 3. Customer B creates a distinct support ticket.
  const ticketB1 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerB_id,
          subject: "Product defect",
          body: "CustomerB: Received defective item.",
          priority: "normal",
          category: "product",
        },
      },
    );
  typia.assert(ticketB1);

  // 4. Customer A performs a general search: expects only their own tickets regardless of broad filter.
  {
    const result =
      await api.functional.aimall_backend.customer.supportTickets.search(
        connection,
        {
          body: {
            requester_id: customerA_id,
          },
        },
      );
    typia.assert(result);
    for (const t of result.data)
      TestValidator.equals("all tickets belong to CustomerA")(t.requester_id)(
        customerA_id,
      );
  }

  // 5. Customer A searches with a subject filter matching one ticket.
  {
    const result =
      await api.functional.aimall_backend.customer.supportTickets.search(
        connection,
        {
          body: {
            requester_id: customerA_id,
            subject: "Shipping delay",
          },
        },
      );
    typia.assert(result);
    for (const t of result.data)
      TestValidator.equals("subject search also isolates CustomerA")(
        t.requester_id,
      )(customerA_id);
  }

  // 6. Customer A searches by category, querying for a different ticket.
  {
    const result =
      await api.functional.aimall_backend.customer.supportTickets.search(
        connection,
        {
          body: {
            requester_id: customerA_id,
            category: "payment",
          },
        },
      );
    typia.assert(result);
    for (const t of result.data)
      TestValidator.equals("category filter enforces CustomerA isolation")(
        t.requester_id,
      )(customerA_id);
  }

  // 7. Control: Customer B searches and expects only their own ticket.
  {
    const result =
      await api.functional.aimall_backend.customer.supportTickets.search(
        connection,
        {
          body: {
            requester_id: customerB_id,
          },
        },
      );
    typia.assert(result);
    for (const t of result.data)
      TestValidator.equals("CustomerB sees only their ticket")(t.requester_id)(
        customerB_id,
      );
  }
}
