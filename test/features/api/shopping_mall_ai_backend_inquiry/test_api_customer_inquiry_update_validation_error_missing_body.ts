import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";

/**
 * Validates that updating an inquiry with a missing or empty body fails
 * validation.
 *
 * This test ensures that the inquiry update endpoint enforces presence of
 * updatable fields, rejecting update attempts with an empty object as the
 * body. It reflects real-world defense against incomplete update requests,
 * maintaining business data integrity and robust error handling.
 *
 * Steps:
 *
 * 1. Register and authenticate a customer.
 * 2. Create a new inquiry as that customer (valid input).
 * 3. Attempt to update the inquiry using an empty object as body. Test expects
 *    validation failure. Example: PUT
 *    /shoppingMallAiBackend/customer/inquiries/{inquiryId} with body: {}.
 */
export async function test_api_customer_inquiry_update_validation_error_missing_body(
  connection: api.IConnection,
) {
  // 1. Register and authenticate customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerName = RandomGenerator.name();
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: customerName,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 2. Create inquiry
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          private: false,
          status: "open",
        } satisfies IShoppingMallAiBackendInquiry.ICreate,
      },
    );
  typia.assert(inquiry);

  // 3. Attempt to update inquiry with empty object as body (violates validation)
  await TestValidator.error(
    "update inquiry with empty body must fail validation",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.update(
        connection,
        {
          inquiryId: inquiry.id,
          body: {} satisfies IShoppingMallAiBackendInquiry.IUpdate,
        },
      );
    },
  );
}
