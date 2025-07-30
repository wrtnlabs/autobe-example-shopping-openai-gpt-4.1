import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate successful linking of a new external account (such as Google) to an
 * existing customer account.
 *
 * This test covers the following workflow:
 *
 * 1. Register a new customer in the backend system, ensuring email and phone are
 *    unique and status is set.
 * 2. Link a new external account (e.g., Google, Kakao, Apple) to this customer by
 *    specifying the provider and external user ID.
 * 3. Validate that the API returns a successfully created external account entity,
 *    and verify all fields.
 * 4. Ensure that the external account's customer_id matches the just-created
 *    customer, and that provider/external_user_id fields match input.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_link_external_account_to_customer_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a new customer.
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const uniquePhone = RandomGenerator.mobile();
  const customerStatus = "active";
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: uniqueEmail,
        phone: uniquePhone,
        password_hash: null, // External account registration, no password yet
        status: customerStatus,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Link an external account (e.g., Google) to this customer
  const provider = "google"; // Use a common provider
  const externalUserId = RandomGenerator.alphaNumeric(18);
  const linkedAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider,
          external_user_id: externalUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(linkedAccount);

  // 3. Validate returned entity matches input and is properly linked
  TestValidator.equals("customer ID")(linkedAccount.customer_id)(customer.id);
  TestValidator.equals("provider")(linkedAccount.provider)(provider);
  TestValidator.equals("external user id")(linkedAccount.external_user_id)(
    externalUserId,
  );
  TestValidator.predicate("linked_at is ISO8601 string")(
    !!Date.parse(linkedAccount.linked_at),
  );
  TestValidator.predicate("external account id is uuid")(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
      linkedAccount.id,
    ),
  );
}
