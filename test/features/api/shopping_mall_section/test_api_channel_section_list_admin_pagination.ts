import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test listing the sections of a shopping mall channel as admin.
 *
 * This test validates that after registering as an admin and creating a
 * channel, listing sections as an admin returns an empty list and correct
 * pagination metrics. Additionally, it tests that unauthenticated requests to
 * the endpoint are denied. Section creation and pagination tests are skipped
 * since no API for section creation exists in the provided endpoints.
 *
 * Steps:
 *
 * 1. Register and login as admin.
 * 2. Create a channel.
 * 3. List sections—should return empty data and valid pagination details.
 * 4. Validate that unauthenticated requests are denied access.
 */
export async function test_api_channel_section_list_admin_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin and login context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. List sections; expect empty result
  const res = await api.functional.shoppingMall.admin.channels.sections.index(
    connection,
    {
      channelId: channel.id,
      body: { page: 1, limit: 10 } satisfies IShoppingMallSection.IRequest,
    },
  );
  typia.assert(res);
  TestValidator.equals("initial pagination pages", res.pagination.pages, 0);
  TestValidator.equals("initial pagination records", res.pagination.records, 0);
  TestValidator.equals("initial data empty", res.data.length, 0);

  // 4. Validate that unauthenticated requests are denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deny unauthenticated section listing",
    async () => {
      await api.functional.shoppingMall.admin.channels.sections.index(
        unauthConn,
        {
          channelId: channel.id,
          body: { page: 1, limit: 10 } satisfies IShoppingMallSection.IRequest,
        },
      );
    },
  );
}
