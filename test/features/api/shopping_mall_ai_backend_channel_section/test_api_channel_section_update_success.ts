import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";

export async function test_api_channel_section_update_success(
  connection: api.IConnection,
) {
  /**
   * E2E: Admin can update a channel's section properties successfully.
   *
   * Validates admin's ability to update a section (name/order/code/etc.) for a
   * sales channel:
   *
   * 1. Register admin (and authenticate context)
   * 2. Create a channel (get channelId)
   * 3. Add a section to the channel (get sectionId)
   * 4. Update this section's name/order/code/parent_id/description
   * 5. Verify response matches requested update and no extraneous changes occurred
   */

  // 1. Register as admin
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(joinResult);
  const admin = joinResult.admin;
  TestValidator.predicate(
    "admin registration yields id",
    typeof admin.id === "string" && admin.id.length > 0,
  );

  // 2. Create a new channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 9 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);
  TestValidator.predicate(
    "channel creation yields id",
    typeof channel.id === "string" && channel.id.length > 0,
  );

  // 3. Add a section to the channel
  const sectionInput: IShoppingMallAiBackendChannelSection.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    order: 1,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);
  TestValidator.predicate(
    "section creation yields id",
    typeof section.id === "string" && section.id.length > 0,
  );

  // 4. Update section fields
  const newCode = RandomGenerator.alphaNumeric(6);
  const newName = RandomGenerator.name(3);
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const newOrder = section.order + 1;
  const updateInput: IShoppingMallAiBackendChannelSection.IUpdate = {
    code: newCode,
    name: newName,
    description: newDescription,
    order: newOrder,
    parent_id: null, // set to root if originally a child (or keep root)
  };

  const updatedSection =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.update(
      connection,
      {
        channelId: section.shopping_mall_ai_backend_channel_id,
        sectionId: section.id,
        body: updateInput,
      },
    );
  typia.assert(updatedSection);

  // 5. Validation: updated fields reflect change, others remain same
  TestValidator.equals("updated code", updatedSection.code, newCode);
  TestValidator.equals("updated name", updatedSection.name, newName);
  TestValidator.equals(
    "updated description",
    updatedSection.description,
    newDescription,
  );
  TestValidator.equals("updated order", updatedSection.order, newOrder);
  TestValidator.equals(
    "updated parent_id (is null/root)",
    updatedSection.parent_id,
    null,
  );

  // Validate unchanged channel id
  TestValidator.equals(
    "unchanged channel_id",
    updatedSection.shopping_mall_ai_backend_channel_id,
    section.shopping_mall_ai_backend_channel_id,
  );
  TestValidator.notEquals(
    "updated_at field was changed",
    updatedSection.updated_at,
    section.updated_at,
  );
}
