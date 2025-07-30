import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * E2E test for listing external accounts linked to a customer.
 *
 * Validates the business flow where a customer with multiple linked external
 * accounts (such as Google and Apple) can retrieve a list of their linked
 * accounts, and ensures that only the correct accounts are shown. Also includes
 * a negative case to guarantee that accounts linked to another customer are
 * never visible in this customer's list.
 *
 * Steps:
 *
 * 1. Register a new customer (with unique email/phone)
 * 2. Link at least two external accounts (Google and Apple) to the customer
 * 3. Fetch all external accounts for this customer, and assert both accounts are
 *    present with correct provider and IDs
 * 4. Ensure all external accounts belong to the correct customer
 * 5. Create a second customer and link a separate external account
 * 6. Refetch the original customer's accounts and confirm only the correct
 *    accounts are present (negative test; isolation)
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_list_external_accounts_for_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const uniqueEmail: string = typia.random<string & tags.Format<"email">>();
  const uniquePhone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: uniqueEmail,
        phone: uniquePhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Link two external accounts (Google and Apple)
  const googleUserId = RandomGenerator.alphaNumeric(18);
  const googleAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: googleUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(googleAccount);

  const appleUserId = RandomGenerator.alphaNumeric(18);
  const appleAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "apple",
          external_user_id: appleUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(appleAccount);

  // 3. Fetch all external accounts for this customer
  const page =
    await api.functional.aimall_backend.customer.customers.externalAccounts.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(page);

  // 4. Verify both linked accounts are present and belong to this customer
  TestValidator.predicate("all accounts belong to this customer")(
    page.data.every((acc) => acc.customer_id === customer.id),
  );
  TestValidator.predicate("google account present")(
    page.data.some(
      (acc) =>
        acc.provider === "google" && acc.external_user_id === googleUserId,
    ),
  );
  TestValidator.predicate("apple account present")(
    page.data.some(
      (acc) => acc.provider === "apple" && acc.external_user_id === appleUserId,
    ),
  );
  TestValidator.equals("account count is 2")(page.data.length)(2);

  // 5. Create another customer and link an external account
  const otherEmail: string = typia.random<string & tags.Format<"email">>();
  const otherPhone: string = RandomGenerator.mobile();
  const otherCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: otherEmail,
        phone: otherPhone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(otherCustomer);
  const kakaoUserId = RandomGenerator.alphaNumeric(18);
  const kakaoAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: otherCustomer.id,
        body: {
          provider: "kakao",
          external_user_id: kakaoUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(kakaoAccount);

  // 6. Refetch for original customer, ensure other's account is not visible
  const page2 =
    await api.functional.aimall_backend.customer.customers.externalAccounts.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(page2);
  TestValidator.predicate("all accounts belong to original customer")(
    page2.data.every((acc) => acc.customer_id === customer.id),
  );
  TestValidator.predicate("other customer's kakao account not present")(
    !page2.data.some((acc) => acc.id === kakaoAccount.id),
  );
}
