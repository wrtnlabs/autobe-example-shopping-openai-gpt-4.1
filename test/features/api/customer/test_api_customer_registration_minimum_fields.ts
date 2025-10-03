import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test successful customer registration (join) with minimum required fields
 * (channel, email, name).
 *
 * 1. Randomly generate a valid channel UUID, customer email, and customer name.
 * 2. Register a new customer using ONLY these required fields via
 *    api.functional.auth.customer.join.
 * 3. Assert response is IShoppingMallCustomer.IAuthorized, includes a JWT token,
 *    and the customer fields (status, kyc_status, timestamps) are
 *    auto-populated with expected defaults. Phone is omitted (undefined).
 * 4. Immediately attempt a duplicate registration using the same channel and
 *    email.
 * 5. Assert the duplicate registration is blocked (error triggered), confirming
 *    business logic for unique constraint (email/channel).
 */
export async function test_api_customer_registration_minimum_fields(
  connection: api.IConnection,
) {
  // 1. Generate random channel UUID, email, name
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const name = RandomGenerator.name(); // max 64 chars by schema

  // 2. Register new customer using required fields only
  const result = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email,
      name,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(result);

  // 3. Assert system-assigned defaults and JWT token presence
  TestValidator.predicate(
    "response includes valid token structure",
    result.token &&
      typeof result.token.access === "string" &&
      result.token.access.length > 0 &&
      typeof result.token.refresh === "string" &&
      result.token.refresh.length > 0,
  );
  TestValidator.equals(
    "registration channel id",
    result.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals("registration email", result.email, email);
  TestValidator.equals("registration name", result.name, name);
  TestValidator.equals("phone is omitted/undefined", result.phone, undefined); // phone omitted
  TestValidator.predicate(
    "status is non-empty string",
    typeof result.status === "string" && result.status.length > 0,
  );
  TestValidator.predicate(
    "kyc_status is non-empty string",
    typeof result.kyc_status === "string" && result.kyc_status.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );

  // 4. Attempt duplicate registration
  await TestValidator.error(
    "duplicate registration is blocked (unique email/channel)",
    async () => {
      await api.functional.auth.customer.join(connection, {
        body: {
          shopping_mall_channel_id: channelId,
          email,
          name: RandomGenerator.name(), // can change name (not unique)
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
}
