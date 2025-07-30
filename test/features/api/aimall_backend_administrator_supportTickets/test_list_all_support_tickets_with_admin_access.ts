import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate the administrator's ability to list all support tickets in the
 * system.
 *
 * This test ensures that support tickets created by both customers and sellers
 * are listed and visible to an administrator, and all schema fields, including
 * pagination/sorting, are provided. It also ensures the admin view can see all
 * tickets regardless of their creator, which is not possible for
 * customer/seller roles.
 *
 * Steps:
 *
 * 1. Create a support ticket as a customer (prepare at least one customer ticket)
 * 2. Create a support ticket as a seller (prepare at least one seller ticket)
 * 3. (Assume the connection is set for administrator role--or skip if such auth is
 *    handled outside)
 * 4. Call GET /aimall-backend/administrator/supportTickets
 * 5. Assert response includes both customer and seller tickets (match by IDs), and
 *    that each ticket contains all schema fields
 * 6. Assert presence and correctness of pagination and sorting metadata
 * 7. Optionally, validate that tickets not visible to non-admins appear in admin
 *    list.
 */
export async function test_api_aimall_backend_administrator_supportTickets_index(
  connection: api.IConnection,
) {
  // 1. Create support ticket as a customer
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const customerTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customer_id,
          subject: "Customer issue - " + RandomGenerator.alphabets(10),
          body: "Support request body from customer.",
          priority: "normal",
          category: "account",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(customerTicket);

  // 2. Create support ticket as a seller
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const sellerTicket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: seller_id,
          subject: "Seller issue - " + RandomGenerator.alphabets(10),
          body: "Support request body from seller.",
          priority: "urgent",
          category: "product",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(sellerTicket);

  // 3. Retrieve all support tickets as admin
  const response =
    await api.functional.aimall_backend.administrator.supportTickets.index(
      connection,
    );
  typia.assert(response);

  // 4. Validate ticket existence & schema fields
  const all_ticket_ids = response.data.map((t) => t.id);
  TestValidator.predicate("customer ticket present")(
    all_ticket_ids.includes(customerTicket.id),
  );
  TestValidator.predicate("seller ticket present")(
    all_ticket_ids.includes(sellerTicket.id),
  );
  TestValidator.equals("pagination meta fields present")(
    Object.keys(response.pagination).sort(),
  )(["current", "limit", "pages", "records"].sort());

  // 5. Validate important fields on returned tickets
  const tickets_to_check = response.data.filter((t) =>
    [customerTicket.id, sellerTicket.id].includes(t.id),
  );
  for (const ticket of tickets_to_check) {
    TestValidator.equals("id matches")(typeof ticket.id)("string");
    TestValidator.equals("requester_id present")(typeof ticket.requester_id)(
      "string",
    );
    TestValidator.equals("subject present")(typeof ticket.subject)("string");
    TestValidator.equals("body present")(typeof ticket.body)("string");
    TestValidator.equals("status present")(typeof ticket.status)("string");
    TestValidator.equals("priority present")(typeof ticket.priority)("string");
    TestValidator.equals("category present")(typeof ticket.category)("string");
    TestValidator.equals("created_at present")(typeof ticket.created_at)(
      "string",
    );
    TestValidator.equals("updated_at present")(typeof ticket.updated_at)(
      "string",
    );
  }
}
