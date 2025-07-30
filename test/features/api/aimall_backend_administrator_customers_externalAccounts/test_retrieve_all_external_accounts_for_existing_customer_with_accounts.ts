import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate administrator can retrieve all linked external accounts for a
 * customer.
 *
 * This test ensures the system correctly links multiple external (OAuth)
 * accounts (e.g., Google, Kakao) to a single customer, and that the admin can
 * query all linked providers in a single fetch.
 *
 * Steps:
 *
 * 1. Register a new backend customer, capturing the returned user ID.
 * 2. As admin, link a Google external account (with a randomly generated
 *    external_user_id) to this customer.
 * 3. Link a Kakao external account (with a different random external_user_id) to
 *    the same customer.
 * 4. Use the admin fetch API to retrieve all external accounts for that customer.
 * 5. Confirm that both Google and Kakao accounts are present, with correct
 *    provider/external_user_id fields, and that timestamps and customer IDs
 *    match expectations.
 * 6. Verify no unexpected providers are present, and the length matches the number
 *    of links made.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_retrieve_all_external_accounts_for_existing_customer_with_accounts(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(10)}@test.local` as string,
        phone: `010${typia.random<string>().slice(0, 8)}` as string,
        password_hash: RandomGenerator.alphaNumeric(16),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Link Google external account
  const googleExternalUserId = RandomGenerator.alphaNumeric(24);
  const googleAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "google",
          external_user_id: googleExternalUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(googleAccount);

  // 3. Link Kakao external account
  const kakaoExternalUserId = RandomGenerator.alphaNumeric(24);
  const kakaoAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "kakao",
          external_user_id: kakaoExternalUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(kakaoAccount);

  // 4. Retrieve all linked external accounts for this customer
  const page =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(page);
  const accounts = page.data;
  TestValidator.equals("number of external accounts linked")(accounts.length)(
    2,
  );

  // 5. Confirm correct providers, user IDs, and linkage
  const providers = accounts.map((a) => a.provider);
  TestValidator.predicate("contains google")(providers.includes("google"));
  TestValidator.predicate("contains kakao")(providers.includes("kakao"));

  const googleLink = accounts.find((a) => a.provider === "google");
  TestValidator.equals("google external_user_id")(googleLink?.external_user_id)(
    googleExternalUserId,
  );
  TestValidator.equals("google customer_id")(googleLink?.customer_id)(
    customer.id,
  );
  TestValidator.predicate("google linked_at present")(!!googleLink?.linked_at);

  const kakaoLink = accounts.find((a) => a.provider === "kakao");
  TestValidator.equals("kakao external_user_id")(kakaoLink?.external_user_id)(
    kakaoExternalUserId,
  );
  TestValidator.equals("kakao customer_id")(kakaoLink?.customer_id)(
    customer.id,
  );
  TestValidator.predicate("kakao linked_at present")(!!kakaoLink?.linked_at);

  // 6. Assert there are no other providers
  TestValidator.equals("providers only google/kakao")(providers.sort())(
    ["google", "kakao"].sort(),
  );
}
