import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates administrator advanced support ticket search and filtering covering
 * multiple roles, statuses, categories, date ranges, assignments, and
 * priorities.
 *
 * This test ensures that an administrator can search and filter the complete
 * support ticket queue across all roles (customers and sellers) using complex
 * criteria: status, requester, admin assignee, category, time ranges, subject,
 * priority, and pagination.
 *
 * Steps:
 *
 * 1. Create support tickets as customers with diverse statuses, priorities, and
 *    categories.
 * 2. Create support tickets as sellers with different parameters.
 * 3. Prepare multiple advanced filters:
 *
 *    - By requester_id
 *    - By category and priority
 *    - By created_at date window
 *    - By combinations of status (if modifiable) and category
 *    - By subject substring
 * 4. As admin, invoke PATCH /aimall-backend/administrator/supportTickets with each
 *    filter including pagination options.
 * 5. Assert that returned tickets match the filter conditions and include all
 *    administrative fields.
 * 6. Check pagination fields in the result as well.
 */
export async function test_api_aimall_backend_administrator_supportTickets_search(
  connection: api.IConnection,
) {
  // 1. Create test users (customer and seller IDs)
  const customer_id_1 = typia.random<string & tags.Format<"uuid">>();
  const customer_id_2 = typia.random<string & tags.Format<"uuid">>();
  const seller_id_1 = typia.random<string & tags.Format<"uuid">>();
  const seller_id_2 = typia.random<string & tags.Format<"uuid">>();

  // 2. Create support tickets from both roles
  // Customer ticket 1: delivery/urgent
  const cust_ticket_1 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customer_id_1,
          subject: "DELIVERY: Order not delivered",
          body: "My order is missing. Please address urgently.",
          priority: "urgent",
          category: "delivery",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(cust_ticket_1);
  // Customer ticket 2: payment/high
  const cust_ticket_2 =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customer_id_2,
          subject: "PAYMENT: Payment failed",
          body: "Payment not processed correctly.",
          priority: "high",
          category: "payment",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(cust_ticket_2);
  // Seller ticket 1: product/normal
  const sell_ticket_1 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: seller_id_1,
          subject: "PRODUCT: Info update needed",
          body: "I need to edit product description details.",
          priority: "normal",
          category: "product",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(sell_ticket_1);
  // Seller ticket 2: account/urgent
  const sell_ticket_2 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: seller_id_2,
          subject: "ACCOUNT: Cannot access account",
          body: "Locked out of portal, need help.",
          priority: "urgent",
          category: "account",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(sell_ticket_2);

  // 3a. Filter by requester_id (should return only those tickets)
  const filter_by_requester = {
    requester_id: customer_id_1,
    assignee_admin_id: null,
    subject: null,
    status: null,
    priority: null,
    category: null,
    create_from: null,
    create_to: null,
    page: 1,
    limit: 10,
  } satisfies IAimallBackendSupportTicket.IRequest;
  const by_requester =
    await api.functional.aimall_backend.administrator.supportTickets.search(
      connection,
      { body: filter_by_requester },
    );
  typia.assert(by_requester);
  for (const t of by_requester.data) {
    TestValidator.equals("requester matches")(t.requester_id)(customer_id_1);
  }

  // 3b. Filter by category and priority (delivery/urgent)
  const filter_by_category_priority = {
    requester_id: null,
    assignee_admin_id: null,
    subject: null,
    status: null,
    priority: "urgent",
    category: "delivery",
    create_from: null,
    create_to: null,
    page: 1,
    limit: 10,
  } satisfies IAimallBackendSupportTicket.IRequest;
  const by_category_priority =
    await api.functional.aimall_backend.administrator.supportTickets.search(
      connection,
      { body: filter_by_category_priority },
    );
  typia.assert(by_category_priority);
  for (const t of by_category_priority.data) {
    TestValidator.equals("category matches")(t.category)("delivery");
    TestValidator.equals("priority matches")(t.priority)("urgent");
  }

  // 3c. Filter by created_at window
  const now = new Date();
  const date_from = new Date(now.getTime() - 3600 * 1000).toISOString();
  const date_to = new Date(now.getTime() + 3600 * 1000).toISOString();
  const filter_by_date = {
    requester_id: null,
    assignee_admin_id: null,
    subject: null,
    status: null,
    priority: null,
    category: null,
    create_from: date_from,
    create_to: date_to,
    page: 1,
    limit: 10,
  } satisfies IAimallBackendSupportTicket.IRequest;
  const by_date =
    await api.functional.aimall_backend.administrator.supportTickets.search(
      connection,
      { body: filter_by_date },
    );
  typia.assert(by_date);
  for (const t of by_date.data) {
    TestValidator.predicate("created_at in date window")(
      t.created_at >= date_from && t.created_at <= date_to,
    );
  }

  // 3d. Filter by subject substring (e.g., 'PAYMENT:')
  const filter_by_subject = {
    requester_id: null,
    assignee_admin_id: null,
    subject: "PAYMENT:",
    status: null,
    priority: null,
    category: null,
    create_from: null,
    create_to: null,
    page: 1,
    limit: 10,
  } satisfies IAimallBackendSupportTicket.IRequest;
  const by_subject =
    await api.functional.aimall_backend.administrator.supportTickets.search(
      connection,
      { body: filter_by_subject },
    );
  typia.assert(by_subject);
  for (const t of by_subject.data) {
    TestValidator.predicate("subject contains PAYMENT:")(
      t.subject.includes("PAYMENT:"),
    );
  }

  // 3e. Filter by role-disjoint category and priority (should hit seller only)
  const filter_seller_account_urgent = {
    requester_id: null,
    assignee_admin_id: null,
    subject: null,
    status: null,
    priority: "urgent",
    category: "account",
    create_from: null,
    create_to: null,
    page: 1,
    limit: 10,
  } satisfies IAimallBackendSupportTicket.IRequest;
  const seller_account_urgent =
    await api.functional.aimall_backend.administrator.supportTickets.search(
      connection,
      { body: filter_seller_account_urgent },
    );
  typia.assert(seller_account_urgent);
  for (const t of seller_account_urgent.data) {
    TestValidator.equals("category matches")(t.category)("account");
    TestValidator.equals("priority matches")(t.priority)("urgent");
  }

  // 4. Validate presence of all key admin fields and pagination meta for result
  for (const pg of [
    by_requester,
    by_category_priority,
    by_date,
    by_subject,
    seller_account_urgent,
  ]) {
    for (const t of pg.data) {
      typia.assert(t); // full type safety on each
      TestValidator.predicate("all ticket fields present")(
        !!t.id &&
          !!t.requester_id &&
          typeof t.subject === "string" &&
          typeof t.body === "string" &&
          typeof t.status === "string" &&
          typeof t.priority === "string" &&
          typeof t.category === "string" &&
          typeof t.created_at === "string" &&
          typeof t.updated_at === "string",
      );
    }
    TestValidator.predicate("pagination meta valid")(
      typeof pg.pagination === "object" &&
        typeof pg.pagination.current === "number" &&
        typeof pg.pagination.limit === "number" &&
        typeof pg.pagination.records === "number" &&
        typeof pg.pagination.pages === "number",
    );
  }
}
