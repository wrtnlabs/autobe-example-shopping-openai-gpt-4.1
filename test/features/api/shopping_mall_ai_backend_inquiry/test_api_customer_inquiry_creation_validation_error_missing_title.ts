import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

/**
 * Validates inquiry creation enforces required field: title.
 *
 * This test ensures that attempts to create a customer inquiry with the
 * required 'title' field set to an empty string correctly fails validation
 * with a runtime error, enforcing business constraints.
 *
 * Omission of the required 'title' property (missing key) would cause a
 * TypeScript compile-time error, which is not tested in runtime E2E per
 * framework policy; therefore, only runtime validation is covered.
 *
 * Business flow:
 *
 * 1. Register a new customer account (providing valid registration info).
 * 2. As the newly registered customer, attempt to create a new inquiry with
 *    'title' as an empty string.
 *
 *    - Expect the API to fail the request and return a validation error, not to
 *         create the inquiry.
 */
export async function test_api_customer_inquiry_creation_validation_error_missing_title(
  connection: api.IConnection,
) {
  // Step 1. Register a customer for authentication context
  const email: string = typia.random<string & tags.Format<"email">>();
  const phone: string = RandomGenerator.mobile();
  const password: string = RandomGenerator.alphaNumeric(12);
  const name: string = RandomGenerator.name();
  const nickname: string = RandomGenerator.name();
  const joinOutput = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinOutput);
  const customerId = joinOutput.customer.id;

  // Step 2. Attempt inquiry creation with 'title' as empty string
  await TestValidator.error(
    "creating inquiry with empty string title should fail validation",
    async () => {
      const inquiryPayload: IShoppingMallAiBackendInquiry.ICreate = {
        customer_id: customerId,
        title: "",
        body: RandomGenerator.content(),
        private: false,
        status: "open",
      };
      await api.functional.shoppingMallAiBackend.customer.inquiries.create(
        connection,
        {
          body: inquiryPayload,
        },
      );
    },
  );
}
