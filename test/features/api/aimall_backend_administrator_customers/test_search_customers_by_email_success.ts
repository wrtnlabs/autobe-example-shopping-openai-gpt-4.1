import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced customer account search using email filtering and pagination
 * (admin dashboard scenario).
 *
 * Purpose: Ensure searching the customer dataset by specific email yields only
 * the matching entry and paginates results correctly. Validates that admin can
 * pinpoint individual customers for audit or support.
 *
 * Business context: Customer management for compliance, fraud investigation, or
 * support requires precise lookup of unique email records and accurate result
 * pagination.
 *
 * Steps:
 *
 * 1. Register multiple customers, each with a unique email address (at least 3)
 * 2. Choose one of the created customers and use its email as a search filter
 *    (admin advanced search patch endpoint)
 * 3. Execute the advanced customer search with email filter set to that customer's
 *    email
 * 4. Confirm response returns only one data row (the correct customer) in
 *    pagination data array
 * 5. Confirm pagination metadata describes a single record and single page
 * 6. Confirm customer summary values (email, id, phone, status) match the search
 *    target
 */
export async function test_api_aimall_backend_administrator_customers_test_search_customers_by_email_success(
  connection: api.IConnection,
) {
  // 1. Register multiple customers with unique emails
  const customers: IAimallBackendCustomer[] = await ArrayUtil.asyncRepeat(3)(
    async () => {
      const uniqueEmail = typia.random<string & tags.Format<"email">>();
      const customer = await api.functional.aimall_backend.customers.create(
        connection,
        {
          body: {
            email: uniqueEmail,
            phone: RandomGenerator.mobile(),
            password_hash: RandomGenerator.alphaNumeric(32),
            status: "active",
          } satisfies IAimallBackendCustomer.ICreate,
        },
      );
      typia.assert(customer);
      return customer;
    },
  );

  // 2. Choose a customer to search for (randomly select one)
  const searchTarget = RandomGenerator.pick(customers);

  // 3. Admin advanced customer search by email
  const result =
    await api.functional.aimall_backend.administrator.customers.search(
      connection,
      {
        body: {
          email: searchTarget.email,
          limit: 100,
          page: 1,
        } satisfies IAimallBackendCustomer.IRequest,
      },
    );
  typia.assert(result);

  // 4. Confirm response returns only the matching customer in data
  TestValidator.equals("single result row")(result.data.length)(1);
  const found = result.data[0];

  // 5. Confirm pagination metadata is correct
  TestValidator.equals("pagination.records")(result.pagination.records)(1);
  TestValidator.equals("pagination.pages")(result.pagination.pages)(1);
  TestValidator.equals("pagination.current")(result.pagination.current)(1);

  // 6. Confirm summary fields match the search target
  TestValidator.equals("email")(found.email)(searchTarget.email);
  TestValidator.equals("id")(found.id)(searchTarget.id);
  TestValidator.equals("phone")(found.phone)(searchTarget.phone);
  TestValidator.equals("status")(found.status)(searchTarget.status);
}
