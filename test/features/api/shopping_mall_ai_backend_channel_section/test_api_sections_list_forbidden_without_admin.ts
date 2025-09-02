import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import type { IPageIShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_sections_list_forbidden_without_admin(
  connection: api.IConnection,
) {
  /**
   * Test that listing channel sections is forbidden for
   * unauthenticated/unauthorized users.
   *
   * 1. Register a new admin account to obtain admin privileges.
   * 2. As admin, create a channel.
   * 3. As admin, add a section to the created channel.
   * 4. Rebuild a connection object with empty headers (deliberately miss
   *    Authorization).
   * 5. Attempt to call the PATCH
   *    /shoppingMallAiBackend/admin/channels/{channelId}/sections endpoint
   *    without admin credentials.
   * 6. Validate the response triggers an auth/permissions error as expected.
   */

  // Step 1: Register admin account and get admin context
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@company.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create a new channel with admin context
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // Step 3: Create a section for this channel (still as admin)
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          order: 1,
        } satisfies IShoppingMallAiBackendChannelSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 4: Rebuild connection object with empty headers to simulate unauthorized call
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 5: Try listing sections - should fail due to lack of auth
  await TestValidator.error(
    "PATCH /shoppingMallAiBackend/admin/channels/{channelId}/sections must fail for unauthorized",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.sections.index(
        unauthConn,
        {
          channelId: channel.id,
          body: {} satisfies IShoppingMallAiBackendChannelSection.IRequest,
        },
      );
    },
  );
}
