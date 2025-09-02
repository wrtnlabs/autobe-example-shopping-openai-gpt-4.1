import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import type { IPageIShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_channel_categories_search_invalid_channel_failure(
  connection: api.IConnection,
) {
  /**
   * Validate error handling for category search with an invalid or non-existent
   * channelId.
   *
   * 1. Register and authenticate as admin. This is required to access the category
   *    search API (admin-only privilege).
   * 2. Attempt to perform a PATCH search of channel categories using a random UUID
   *    that does not correspond to any existing channel.
   * 3. Confirm the API rejects this request and throws an error (invalid resource
   *    reference).
   *
   * Steps:
   *
   * - Generate realistic admin credentials (username, hash, name, email, active).
   * - Authenticate as admin (tokens will be set automatically in connection).
   * - Make a PATCH request using a random UUID as channelId (not tied to any
   *   resource).
   * - Provide syntactically valid (empty) search body ({}).
   * - Assert with TestValidator.error that the request fails (error is thrown).
   * - Do not test for specific status codes or error messages, only that an error
   *   occurs.
   */
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  await TestValidator.error(
    "searching categories with invalid channelId must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
        connection,
        {
          channelId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IShoppingMallAiBackendChannelCategory.IRequest,
        },
      );
    },
  );
}
