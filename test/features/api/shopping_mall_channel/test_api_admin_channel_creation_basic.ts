import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Validate the creation of a new shopping mall channel by an authenticated
 * admin.
 *
 * - Register a new admin via /auth/admin/join (returns tokens, identity)
 * - Use the authenticated connection to create a new channel via
 *   /shoppingMall/admin/channels
 * - Pass code (unique), name, and description to IShoppingMallChannel.ICreate
 * - Assert that the new channel object is returned with all mandatory fields: id,
 *   code, name, description, created_at, updated_at, (deleted_at: null or
 *   undefined)
 * - Use typia.assert for type validation
 * - Assert via TestValidator that object fields match input (code, name,
 *   description)
 * - Assert that the returned id is a valid UUID and audit fields have valid
 *   date-time formats
 * - Only admin is able to do this; no negative non-admin case in this test
 */
export async function test_api_admin_channel_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);

  // 2. Create a new channel as authenticated admin
  const code = RandomGenerator.alphaNumeric(8); // unique code per business rules
  const name = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.content({ paragraphs: 1 });

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: { code, name, description } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Validate channel object: system/audit fields, and business fields match input
  TestValidator.equals("channel code matches", channel.code, code);
  TestValidator.equals("channel name matches", channel.name, name);
  TestValidator.equals(
    "channel description matches",
    channel.description,
    description,
  );

  TestValidator.predicate(
    "channel id is valid uuid",
    typeof channel.id === "string" && channel.id.length === 36,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof channel.created_at === "string" && channel.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof channel.updated_at === "string" && channel.updated_at.length > 10,
  );

  TestValidator.equals(
    "deleted_at must be null or undefined",
    channel.deleted_at ?? null,
    null,
  );
}
