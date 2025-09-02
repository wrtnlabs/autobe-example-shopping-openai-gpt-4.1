import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";

export async function test_api_channel_section_creation_success(
  connection: api.IConnection,
) {
  /**
   * This test validates that an admin user can successfully create a new
   * section within an existing sales channel.
   *
   * Steps:
   *
   * 1. Register a new admin (also logs in), granting required privileges for
   *    subsequent operations.
   * 2. Create a new sales channel as the admin to obtain a valid channelId.
   * 3. Call the channel section creation endpoint with all required fields (code,
   *    name, order, and optionally description).
   * 4. Assert that the response contains all persisted fields, correct references,
   *    and creation evidence.
   *
   * This test confirms correct data validation, business relationships, and
   * role-based access for normal operation.
   */

  // 1. Register and log in as admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(15);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@corp-example.com`;
  const adminJoinInput = {
    username: adminUsername,
    password_hash: adminPassword,
    name: RandomGenerator.name(2),
    email: adminEmail,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username set as input",
    adminAuth.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin account is active",
    adminAuth.admin.is_active,
    true,
  );
  TestValidator.equals(
    "admin email matches",
    adminAuth.admin.email,
    adminEmail,
  );

  // 2. Create a new channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
  TestValidator.equals(
    "channel code matches input",
    channel.code,
    channelInput.code,
  );
  TestValidator.equals("channel country is KR", channel.country, "KR");
  TestValidator.equals("channel currency is KRW", channel.currency, "KRW");
  TestValidator.equals(
    "channel timezone is Asia/Seoul",
    channel.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals("channel language set", channel.language, "ko");

  // 3. Create a new section in the channel
  const sectionInput = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(2),
    order: 1,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    // parent_id omitted for root section
  } satisfies IShoppingMallAiBackendChannelSection.ICreate;
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  // Accurate type assertion for all possible output shapes
  typia.assert<
    Omit<IShoppingMallAiBackendChannelSection, "parent_id" | "deleted_at"> & {
      parent_id?: string | null;
      deleted_at?: string | null;
    }
  >(section);
  TestValidator.equals(
    "section code matches input",
    section.code,
    sectionInput.code,
  );
  TestValidator.equals("section name matches", section.name, sectionInput.name);
  TestValidator.equals("section order matches", section.order, 1);
  TestValidator.equals(
    "section belongs to channel",
    section.shopping_mall_ai_backend_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "section parent_id is undefined or null for root section",
    section.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "section persisted description",
    section.description,
    sectionInput.description,
  );
  TestValidator.predicate(
    "section has created_at timestamp",
    typeof section.created_at === "string" && !!section.created_at,
  );
  TestValidator.predicate(
    "section has updated_at timestamp",
    typeof section.updated_at === "string" && !!section.updated_at,
  );
  TestValidator.equals(
    "section deleted_at is null or undefined for new section",
    section.deleted_at ?? null,
    null,
  );
}
