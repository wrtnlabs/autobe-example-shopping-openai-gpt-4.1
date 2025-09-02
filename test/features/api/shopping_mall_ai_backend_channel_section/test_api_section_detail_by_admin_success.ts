import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";

export async function test_api_section_detail_by_admin_success(
  connection: api.IConnection,
) {
  /**
   * 1. Register and authenticate as admin to obtain authorization context.
   *
   * This is required to enable usage of admin-only endpoints for channel and
   * section management.
   */
  const adminCreateInput = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminCreateInput,
  });
  typia.assert(adminAuthorized);
  const admin = adminAuthorized.admin;

  /**
   * 2. Create a new sales channel as admin (channelId will be used for creating
   *    sections)
   *
   * All regulatory and localization fields are provided for correct context.
   */
  const channelCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    country: "KR",
    currency: "KRW",
    language: "ko",
    timezone: "Asia/Seoul",
  } satisfies IShoppingMallAiBackendChannel.ICreate;
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      { body: channelCreateInput },
    );
  typia.assert(channel);

  /** 3. Create a section within the created channel. This section will be queried. */
  const sectionCreateInput = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    order: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_id: null,
  } satisfies IShoppingMallAiBackendChannelSection.ICreate;
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionCreateInput,
      },
    );
  typia.assert(section);

  /** 4. Retrieve section detail by admin. */
  const detail =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.at(
      connection,
      {
        channelId: channel.id,
        sectionId: section.id,
      },
    );
  typia.assert(detail);

  /**
   * 5. Validate all fields in the response match those from creation, and that
   *    deletion-related fields are unset.
   */
  TestValidator.equals("section id matches", detail.id, section.id);
  TestValidator.equals(
    "channel id matches",
    detail.shopping_mall_ai_backend_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "parent_id matches",
    detail.parent_id,
    sectionCreateInput.parent_id,
  );
  TestValidator.equals("code matches", detail.code, sectionCreateInput.code);
  TestValidator.equals("name matches", detail.name, sectionCreateInput.name);
  TestValidator.equals(
    "description matches",
    detail.description,
    sectionCreateInput.description,
  );
  TestValidator.equals("order matches", detail.order, sectionCreateInput.order);
  TestValidator.equals("section is not deleted", detail.deleted_at, null);
  TestValidator.predicate(
    "section created_at is ISO date",
    typeof detail.created_at === "string" &&
      !Number.isNaN(Date.parse(detail.created_at)),
  );
  TestValidator.predicate(
    "section updated_at is ISO date",
    typeof detail.updated_at === "string" &&
      !Number.isNaN(Date.parse(detail.updated_at)),
  );
}
