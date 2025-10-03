import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * E2E test for admin-created channel registration and permission enforcement.
 *
 * 1. Register an admin with unique email/password/name using /auth/admin/join. On
 *    success, Authorization token for admin is set on connection.headers for
 *    future admin-level requests.
 * 2. Generate unique channel code and channel metadata, including
 *    name/description, for the channel creation request. Send valid POST
 *    /shoppingMall/admin/channels with all required fields.
 * 3. Validate success: API returns IShoppingMallChannel, typia.assert() passes,
 *    and response data matches input (code, name, description).
 * 4. Attempt to create another channel with the same business code as step 2.
 *    Expect error with TestValidator.error (business code uniqueness
 *    constraint).
 * 5. Create a second admin (different email) and use that admin to create a
 *    channel with a different code—should succeed.
 * 6. Test that unauthenticated (no Authorization header) requests to
 *    /shoppingMall/admin/channels are rejected (use new connection object with
 *    empty headers; expect error with TestValidator.error).
 */
export async function test_api_channel_creation_by_admin_role(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  const {
    email: adminEmail,
    token: { access: adminAccessToken },
  } = adminJoin;

  // 2. Channel creation (all required fields)
  const channelCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channelName = RandomGenerator.name(2);
  const channelDescription = RandomGenerator.paragraph({ sentences: 8 });
  const channelBody = {
    code: channelCode,
    name: channelName,
    description: channelDescription,
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(createdChannel);
  TestValidator.equals(
    "channel code matches",
    createdChannel.code,
    channelCode,
  );
  TestValidator.equals(
    "channel name matches",
    createdChannel.name,
    channelName,
  );
  TestValidator.equals(
    "channel description matches",
    createdChannel.description,
    channelDescription,
  );

  // 3. Try duplicate channel code (unique constraint violation)
  await TestValidator.error("Duplicate channel code should fail", async () => {
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  });

  // 4. Register another admin and create new channel (should succeed)
  const adminJoin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin2);

  const channelCode2 = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channelBody2 = {
    code: channelCode2,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallChannel.ICreate;
  const createdChannel2 =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody2,
    });
  typia.assert(createdChannel2);
  TestValidator.equals(
    "channel 2 code matches",
    createdChannel2.code,
    channelCode2,
  );

  // 5. Unauthenticated creation attempt - should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthenticated channel creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.create(unauthConn, {
        body: channelBody,
      });
    },
  );
}
