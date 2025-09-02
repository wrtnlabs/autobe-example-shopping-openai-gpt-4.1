import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

export async function test_api_customer_inquiry_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate 'not found' error handling when retrieving a nonexistent inquiry
   * as a customer.
   *
   * This test ensures that the system correctly responds with a not found error
   * when a customer attempts to view the details of an inquiry that does not
   * exist. It covers a negative path validation for robust API error handling.
   *
   * Steps:
   *
   * 1. Register and authenticate as a new customer using random unique
   *    credentials, verifying token is issued.
   * 2. Generate a random UUID for 'inquiryId' that is extremely unlikely to exist.
   * 3. Attempt to retrieve the inquiry detail using the random inquiryId.
   * 4. Expect and validate a standardized error response (such as a 404 Not Found
   *    or business-defined error) indicating the resource does not exist.
   */

  // 1. Register and authenticate as a customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email,
        phone_number: phone,
        password,
        name,
        nickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerAuthorized);

  // 2. Fabricate a random UUID for an inquiry that does not exist
  const fakeInquiryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to fetch detail for the nonexistent inquiry, expect error
  await TestValidator.error(
    "retrieving nonexistent inquiry should throw error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.at(
        connection,
        {
          inquiryId: fakeInquiryId,
        },
      );
    },
  );
}
