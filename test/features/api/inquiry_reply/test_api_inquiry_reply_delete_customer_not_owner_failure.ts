import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_inquiry_reply_delete_customer_not_owner_failure(
  connection: api.IConnection,
) {
  /**
   * Test that non-owners cannot delete inquiry replies they do not own.
   *
   * 1. Register the first customer (the presumed author of a reply).
   * 2. Register the second customer (who will attempt the unauthorized deletion).
   * 3. Switch context to the second customer with fresh authentication.
   * 4. As the second customer, attempt to delete a reply (simulate with random
   *    valid IDs), and check that an error is thrown for lack of
   *    permission/ownership.
   *
   * This verifies business rule enforcement: only reply authors may delete
   * their replies.
   */
  // Step 1: First customer joins
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "1234Abc!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1);

  // Step 2: Second customer joins, overwriting connection's auth token
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "1234Xyz!@#",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2);

  // Step 3/4: As customer2, attempt to erase a reply (that customer1 would own)
  await TestValidator.error(
    "non-owner cannot delete another customer's inquiry reply",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.inquiries.replies.erase(
        connection,
        {
          inquiryId: typia.random<string & tags.Format<"uuid">>(),
          replyId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
