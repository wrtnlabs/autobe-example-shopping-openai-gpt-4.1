import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validates admin update of shopping mall section attributes, including
 * business rule enforcement and error scenarios.
 *
 * 1. Register an admin (to get authentication context)
 * 2. Create a channel
 * 3. Create an initial section under that channel
 * 4. Update the section's name, code, description, display_order via admin section
 *    update
 * 5. Assert that the response contains updated field values
 * 6. Attempt to set the section's code to a duplicate code already used by another
 *    section in the same channel (should fail)
 * 7. Attempt to update a non-existent section (should fail)
 * 8. Attempt to update an existing section using an unauthenticated connection
 *    (should fail)
 * 9. Confirm only permitted fields were changed and timestamps were updated
 */
export async function test_api_admin_section_update_in_channel(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorization
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(adminAuth);

  // 2. Create a channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelInput,
    });
  typia.assert(channel);

  // 3. Create a section in the channel
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Update the section's attributes
  const sectionUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    code: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.IUpdate;
  const updated: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelId: channel.id,
        sectionId: section.id,
        body: sectionUpdate,
      },
    );
  typia.assert(updated);

  // 5. Verify updated values & timestamps
  TestValidator.equals("section id unchanged", updated.id, section.id);
  TestValidator.equals(
    "updated name applied",
    updated.name,
    sectionUpdate.name,
  );
  TestValidator.equals(
    "updated code applied",
    updated.code,
    sectionUpdate.code,
  );
  TestValidator.equals(
    "updated display_order applied",
    updated.display_order,
    sectionUpdate.display_order,
  );
  TestValidator.equals(
    "updated description applied",
    updated.description,
    sectionUpdate.description,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    section.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    section.created_at,
  );

  // 6. Attempt to set duplicate section code (should fail)
  // First, create another section with a different code
  const sectionInput2 = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section2: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput2,
      },
    );
  typia.assert(section2);

  await TestValidator.error("duplicate section code should fail", async () => {
    await api.functional.shoppingMall.admin.channels.sections.update(
      connection,
      {
        channelId: channel.id,
        sectionId: section2.id,
        body: { code: sectionUpdate.code }, // code already used by first updated section
      },
    );
  });

  // 7. Attempt to update a non-existent section (should fail)
  await TestValidator.error(
    "updating non-existent section should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.update(
        connection,
        {
          channelId: channel.id,
          sectionId: typia.random<string & tags.Format<"uuid">>(), // random non-existent UUID
          body: { name: RandomGenerator.paragraph() },
        },
      );
    },
  );

  // 8. Attempt to update using an unauthenticated connection (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated connection update forbidden",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.update(
        unauthConn,
        {
          channelId: channel.id,
          sectionId: section.id,
          body: { name: RandomGenerator.name() },
        },
      );
    },
  );
}
