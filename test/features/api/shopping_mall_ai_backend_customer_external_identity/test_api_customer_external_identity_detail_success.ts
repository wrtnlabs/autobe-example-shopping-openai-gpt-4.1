import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerExternalIdentity } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerExternalIdentity";

export async function test_api_customer_external_identity_detail_success(
  connection: api.IConnection,
) {
  /**
   * Test that a customer can fetch the detail of their own external identity
   * mapping (such as a linked Google or Naver account).
   *
   * This test proceeds as:
   *
   * 1. Register a customer account, which automatically authenticates the user
   *    session.
   * 2. Because there is no endpoint to link or create an external identity via
   *    API, simulate (mock) an external identity record for test
   *    input/expectations.
   * 3. Call the GET
   *    /shoppingMallAiBackend/customer/customers/{customerId}/externalIdentities/{externalIdentityId}
   *    endpoint using the simulated data.
   * 4. Assert that the response matches the type and that all business-critical
   *    fields are present and match the expected provider, customerId, and
   *    timestamps.
   *
   * Note: This test cannot fully validate DB linking due to lack of creation
   * API for external identity.
   */

  // 1. Register and authenticate the customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinRes);

  // 2. Mock an external identity mapping (simulate, as no create endpoint exists)
  const testExternal = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: joinRes.customer.id,
    provider: RandomGenerator.pick([
      "google",
      "naver",
      "apple",
      "kakao",
    ] as const),
    provider_key: RandomGenerator.alphaNumeric(20),
    linked_at: new Date().toISOString(),
    last_verified_at: null,
  } satisfies IShoppingMallAiBackendCustomerExternalIdentity;

  // 3. Call the GET endpoint with simulated IDs
  const output =
    await api.functional.shoppingMallAiBackend.customer.customers.externalIdentities.at(
      connection,
      {
        customerId: testExternal.customer_id,
        externalIdentityId: testExternal.id,
      },
    );
  typia.assert(output);

  // 4. Validate that result matches our simulated input (as much as possible given limitations)
  TestValidator.equals(
    "provider matches expected",
    output.provider,
    testExternal.provider,
  );
  TestValidator.equals(
    "customer_id matches",
    output.customer_id,
    testExternal.customer_id,
  );
  TestValidator.equals(
    "external identity id matches",
    output.id,
    testExternal.id,
  );
  TestValidator.predicate(
    "linked_at is ISO date",
    typeof output.linked_at === "string" &&
      !Number.isNaN(Date.parse(output.linked_at)),
  );
  TestValidator.predicate(
    "last_verified_at is null or ISO date",
    output.last_verified_at === null ||
      (typeof output.last_verified_at === "string" &&
        !Number.isNaN(Date.parse(output.last_verified_at))),
  );
}
