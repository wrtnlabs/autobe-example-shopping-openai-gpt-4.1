import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";

/**
 * Validate that creating a channel section with a duplicate code within the
 * same channel fails due to code uniqueness enforcement.
 *
 * Business context: Sales channels may have multiple sections for
 * navigation or business areas, each with a unique code. The backend
 * enforces that section codes are unique within each channel. This test
 * validates that the API properly prevents duplicate codes per channel,
 * returning an error when an admin attempts to create a second section with
 * an identical code.
 *
 * Test process:
 *
 * 1. Register and authenticate as an admin to obtain authorization for channel
 *    management.
 * 2. Create a new sales channel for test isolation.
 * 3. Create an initial section in the new channel with a randomly generated
 *    unique code.
 * 4. Attempt to create another section in the same channel using the same code
 *    (should fail).
 * 5. Validate that the API call fails as expected (TestValidator.error asserts
 *    error occurrence).
 *
 * This test covers only the duplicate code case within a single channel.
 * Cross-channel uniqueness and varying parent/child logic are not in
 * scope.
 */
export async function test_api_channel_section_creation_duplicate_code_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@testdomain.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  await api.functional.auth.admin.join(connection, { body: adminInput });

  // 2. Create a test sales channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 3. Create the initial section with a unique code in this channel
  const sectionCode = RandomGenerator.alphaNumeric(6);
  const sectionInput = {
    code: sectionCode,
    name: RandomGenerator.name(2),
    order: 1,
    parent_id: null,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAiBackendChannelSection.ICreate;
  const section =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Attempt to create another section with the same code, expecting an error
  const duplicateSectionInput = {
    code: sectionCode, // Duplicate code
    name: RandomGenerator.name(2),
    order: 2,
    parent_id: null,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAiBackendChannelSection.ICreate;
  await TestValidator.error(
    "creating a section with duplicate code in the same channel must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
        connection,
        {
          channelId: channel.id,
          body: duplicateSectionInput,
        },
      );
    },
  );
}
