import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";

export async function test_api_channel_section_update_nonexistent_section_failure(
  connection: api.IConnection,
) {
  /**
   * Test case: Attempt to update a non-existent section in a sales channel as
   * admin and expect error response.
   *
   * Steps:
   *
   * 1. Register a new admin (POST /auth/admin/join). This provides admin
   *    authentication.
   * 2. Create a new channel as that admin (POST
   *    /shoppingMallAiBackend/admin/channels).
   * 3. Attempt to update a section (PUT
   *    /shoppingMallAiBackend/admin/channels/{channelId}/sections/{sectionId})
   *    where the sectionId is guaranteed to not exist (random UUID). The body
   *    uses valid payload structure.
   * 4. Expect the API to reply with an error (such as 404 Not Found or
   *    application-level error), and verify failure by using await
   *    TestValidator.error. This ensures the endpoint protects against invalid
   *    resource references and returns correct error signaling.
   */

  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a channel
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          country: "KR", // ISO 3166-1 alpha-2
          currency: "KRW", // ISO 4217
          language: "ko", // IETF language tag
          timezone: "Asia/Seoul", // IANA timezone
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Attempt to update a section using a random (non-existent) sectionId
  const fakeSectionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update should fail for nonexistent sectionId",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.sections.update(
        connection,
        {
          channelId: channel.id,
          sectionId: fakeSectionId,
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            code: RandomGenerator.alphaNumeric(6),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            order: 1,
          } satisfies IShoppingMallAiBackendChannelSection.IUpdate,
        },
      );
    },
  );
}
