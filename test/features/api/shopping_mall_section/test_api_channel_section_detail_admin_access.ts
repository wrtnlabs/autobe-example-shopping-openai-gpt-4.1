import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate retrieval of detailed information for a specific section within a
 * channel by an admin.
 *
 * This test covers the end-to-end lifecycle of section detail access in the
 * admin context. Steps:
 *
 * 1. Register a new admin.
 * 2. Create a new shopping mall channel.
 * 3. Create a new section within the created channel with random code and name.
 * 4. Retrieve detailed information of this section by providing both channelId and
 *    sectionId via admin endpoint.
 * 5. Assert that all properties in IShoppingMallSection are present and have
 *    correct values (id, shopping_mall_channel_id, code, name, description,
 *    display_order, created_at, updated_at, deleted_at).
 * 6. Assert that the section's shopping_mall_channel_id matches the channel ID
 *    just created.
 * 7. Assert permissions in effect by confirming success as admin.
 */
export async function test_api_channel_section_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminSecretPW1!",
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: channelBody,
    },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // 4. Retrieve section detail
  const result = await api.functional.shoppingMall.admin.channels.sections.at(
    connection,
    {
      channelId: channel.id,
      sectionId: section.id,
    },
  );
  typia.assert(result);

  // 5. Field-level assertions for detail
  TestValidator.equals("Section ID matches", result.id, section.id);
  TestValidator.equals(
    "shopping_mall_channel_id links to channel",
    result.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals("code matches", result.code, sectionBody.code);
  TestValidator.equals("name matches", result.name, sectionBody.name);
  TestValidator.equals(
    "description matches",
    result.description,
    sectionBody.description,
  );
  TestValidator.equals(
    "display_order matches",
    result.display_order,
    sectionBody.display_order,
  );
  TestValidator.predicate(
    "created_at exists",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof result.updated_at === "string" && result.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined for active section",
    result.deleted_at,
    null,
  );
}
