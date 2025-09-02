import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";

/**
 * E2E test to verify that soft deleting a section twice is idempotent.
 *
 * This scenario covers logical deletion (soft delete) of a channel section
 * via the admin API, and verifies that repeating the DELETE operation on an
 * already-deleted (soft) section results in no error or harmful side
 * effects. This ensures compliance with idempotency guarantees expected of
 * RESTful delete semantics.
 *
 * Business workflow:
 *
 * 1. Register an admin account and authenticate (token context for all
 *    actions)
 * 2. Create a channel to own the section (admin authorization required)
 * 3. Create a section in the channel
 * 4. Soft delete (logical delete) the section (set deleted_at)
 * 5. Repeat the soft delete operation (should not error; test idempotency)
 *
 * Optionally, future API extensions may allow verification that repeated
 * delete does not modify or revert the deleted_at timestamp, but this test
 * covers the current expected behavior.
 */
export async function test_api_channel_section_soft_delete_already_deleted_section(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin (required for authorization context)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminJoin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        email: adminEmail,
        phone_number: null,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminJoin);

  // 2. Create a valid sales channel to own the section
  const channel: IShoppingMallAiBackendChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 9,
          }),
          country: "KR",
          currency: "KRW",
          language: "ko-KR",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create a section under that channel
  const section: IShoppingMallAiBackendChannelSection =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          order: 1,
        } satisfies IShoppingMallAiBackendChannelSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. First soft delete (should be successful)
  await api.functional.shoppingMallAiBackend.admin.channels.sections.erase(
    connection,
    {
      channelId: channel.id,
      sectionId: section.id,
    },
  );

  // 5. Second soft delete (idempotency check); expect no error
  await api.functional.shoppingMallAiBackend.admin.channels.sections.erase(
    connection,
    {
      channelId: channel.id,
      sectionId: section.id,
    },
  );
}
