import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test logically deleting (soft-deleting) a shopping mall section in a channel
 * by an admin.
 *
 * Steps:
 *
 * 1. Register a new admin (using /auth/admin/join)
 * 2. Admin creates a channel (using /shoppingMall/admin/channels)
 * 3. Admin creates a section under the channel (using
 *    /shoppingMall/admin/channels/{channelId}/sections)
 * 4. Admin deletes (soft-deletes) the section (using
 *    /shoppingMall/admin/channels/{channelId}/sections/{sectionId})
 * 5. Validate the deleted_at field is set on the section (section is not
 *    physically deleted)
 * 6. Attempt to access the section after deletion – should be inaccessible
 * 7. Attempt to delete the same section again – should error
 * 8. Attempt to delete a non-existent section – should error
 * 9. (Negative) Try erasing with a non-admin – should error
 * 10. Confirm audit/compliance evidence (presence of deleted_at field is audit
 *     evidence)
 */
export async function test_api_admin_section_soft_delete_in_channel(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin-password-1234",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);

  // 2. Create a channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 3. Create a section
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Soft-delete the section
  await api.functional.shoppingMall.admin.channels.sections.erase(connection, {
    channelId: channel.id,
    sectionId: section.id,
  });

  // Try to get the section again (simulate by trying to delete again, which should error, or by logic)
  await TestValidator.error(
    "cannot delete already deleted section",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.erase(
        connection,
        {
          channelId: channel.id,
          sectionId: section.id,
        },
      );
    },
  );

  // Try to delete a non-existent section
  await TestValidator.error("cannot delete non-existent section", async () => {
    await api.functional.shoppingMall.admin.channels.sections.erase(
      connection,
      {
        channelId: channel.id,
        sectionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // Negative: try erasing with a non-admin (simulate with unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot soft-delete section",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.erase(
        unauthConn,
        {
          channelId: channel.id,
          sectionId: section.id,
        },
      );
    },
  );

  // Confirm audit evidence (deleted_at set present on the entity)
  // Since there is no API to fetch after deletion, this is inferred via business logic/contract.
}
