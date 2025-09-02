import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IPageIShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_channel_search_invalid_filter_failure(
  connection: api.IConnection,
) {
  /**
   * Validates error handling when searching channels with invalid filter types
   * or values in the admin backend.
   *
   * Purpose:
   *
   * - Ensure backend correctly rejects invalid input for channel search and
   *   returns validation errors.
   *
   * Steps:
   *
   * 1. Register a valid admin (using /auth/admin/join) to get a valid
   *    authenticated session.
   * 2. Attempt to call the channel index endpoint with an invalid country code
   *    (not ISO 3166-1).
   * 3. Attempt to call with an out-of-range negative page or limit parameter.
   * 4. Attempt to call with an invalid value for `is_active` (e.g., null, which
   *    may break required true/false expectation). (Note: cannot pass an
   *    invalid type like string at compile time; test with an invalid value
   *    instead.) For each case, confirm that a validation error is thrown.
   */
  // 1. Register an admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt invalid country code
  await TestValidator.error(
    "invalid country code should trigger validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.index(
        connection,
        {
          body: {
            country: "123_NOTACOUNTRY",
          } satisfies IShoppingMallAiBackendChannel.IRequest,
        },
      );
    },
  );

  // 3. Attempt negative page or limit
  await TestValidator.error(
    "negative page/limit should trigger validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.index(
        connection,
        {
          body: {
            page: -2,
            limit: -30,
          } satisfies IShoppingMallAiBackendChannel.IRequest,
        },
      );
    },
  );

  // 4. Attempt null for a required boolean filter (which will fail backend logic if not explicitly accepted)
  await TestValidator.error(
    "null for is_active when boolean is expected should trigger validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.index(
        connection,
        {
          body: {
            is_active: null,
          } satisfies IShoppingMallAiBackendChannel.IRequest,
        },
      );
    },
  );
}
