import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test creation of a new shopping mall section by an admin within an existing
 * channel.
 *
 * Steps:
 *
 * 1. Register a new admin using valid random credentials.
 * 2. Create a parent channel using valid random channel info.
 * 3. As the admin, create a section in the channel with random valid attributes
 *    for code, name, display_order, and optional description.
 * 4. Validate that returned section fields match input; all required fields are
 *    present and correct, and optionally check audit fields.
 * 5. Attempt to create another section using the same code in the same channel
 *    (should fail - uniqueness per channel enforced).
 * 6. Attempt to create a section with a non-admin connection (should fail -
 *    permission enforcement).
 * 7. (Optionally) Validate that proper creation is not possible with missing
 *    required fields (compile-time enforced).
 */
export async function test_api_admin_section_creation_in_channel(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);
  // 2. Create parent channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);
  // 3. Create section
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);
  // 4. Validate storage and return values
  TestValidator.equals("section code matches", section.code, sectionBody.code);
  TestValidator.equals("section name matches", section.name, sectionBody.name);
  TestValidator.equals(
    "section description matches",
    section.description,
    sectionBody.description,
  );
  TestValidator.equals(
    "section display_order matches",
    section.display_order,
    sectionBody.display_order,
  );
  TestValidator.equals(
    "section channel id matches",
    section.shopping_mall_channel_id,
    channel.id,
  );
  // 5. Try duplicate code in same channel
  const dupCodeBody = {
    ...sectionBody,
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSection.ICreate;
  await TestValidator.error(
    "duplicate section code in same channel should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.create(
        connection,
        { channelId: channel.id, body: dupCodeBody },
      );
    },
  );
  // 6. Try as non-admin (unauthenticated connection)
  const channel2Body = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallChannel.ICreate;
  const adminlessConn: api.IConnection = { ...connection, headers: {} };
  const channel2 = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channel2Body },
  );
  const sectionNonAdminBody = {
    shopping_mall_channel_id: channel2.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  await TestValidator.error("non-admin cannot create section", async () => {
    await api.functional.shoppingMall.admin.channels.sections.create(
      adminlessConn,
      { channelId: channel2.id, body: sectionNonAdminBody },
    );
  });
}
