import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_create_missing_required_fields_failure(
  connection: api.IConnection,
) {
  /**
   * Validates the API's enforcement of required fields by attempting to create
   * an order with missing data.
   *
   * Steps:
   *
   * 1. Registers and authenticates a customer using the provided join endpoint.
   * 2. Attempts to create an order omitting the required 'currency' property.
   * 3. Expects the API to reject the incomplete request with a validation or
   *    business rule error and to prevent order creation.
   */

  // 1. Register and authenticate a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerName = RandomGenerator.name();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const joinResponse = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword as string & tags.Format<"password">,
      name: customerName,
      // nickname is optional
    },
  });
  typia.assert(joinResponse);
  const customerId = joinResponse.customer.id;

  // 2. Attempt to create an order with a missing required field ('currency')
  // Since TypeScript DTO typing prevents intentionally invalid object structure,
  // use 'as any' here to force an invalid shape (purpose is to trigger a backend error on required property omission)
  const invalidOrderPayload = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    total_amount: 1000,
    // currency is intentionally omitted
    ordered_at: new Date().toISOString(),
  };

  await TestValidator.error(
    "should fail to create order when required field 'currency' is missing",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.create(
        connection,
        {
          body: invalidOrderPayload as any, // Intentional 'as any' for negative-path TypeScript test, NEVER use for happy path
        },
      );
    },
  );
}
