import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IPageIShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate successful admin sales channel search with pagination and
 * multiple filter options.
 *
 * This test covers the core workflow of an admin registering, creating
 * multiple sales channels, and then using the channel search API with
 * various pagination and filtering options, ensuring the resulting data and
 * pagination meta are correct.
 *
 * Steps:
 *
 * 1. Register a new admin, confirming admin context and token.
 * 2. As admin, create several (4-5) unique sales channels covering code, name,
 *    country, currency, language, timezone.
 * 3. Conduct default paginated search (page 1, limit 2). Validate returned
 *    data and pagination meta.
 * 4. Search by specific channel name, code, and country and check filter
 *    correctness.
 * 5. Optionally combine filters and check that only expected channels are
 *    returned, with correct pagination.
 * 6. Use TestValidator assertions on all core validations, including
 *    pagination integrity, search accuracy, and result
 *    inclusion/exclusion.
 */
export async function test_api_admin_channel_search_successful_and_paginated(
  connection: api.IConnection,
) {
  // 1. Register a new admin with unique credentials (simulate password hash)
  const uniqueToken: string = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminUsername = uniqueToken;
  const adminEmail = `${uniqueToken}@testadmin.com`;
  const adminName = RandomGenerator.name();
  const passwordHash = RandomGenerator.alphaNumeric(32); // Simulate password hash

  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);

  // Confirm that admin token and account are returned and is_active
  TestValidator.predicate(
    "admin token returned",
    typeof adminJoinResult.token.access === "string" &&
      adminJoinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "admin account is_active",
    adminJoinResult.admin.is_active === true,
  );

  // 2. Create several (4-5) unique sales channels
  const countryCodes = ["KR", "US", "JP", "DE", "GB"] as const;
  const currencyCodes = ["KRW", "USD", "JPY", "EUR", "GBP"] as const;
  const languageCodes = ["ko-KR", "en-US", "ja-JP", "de-DE", "en-GB"] as const;
  const timezones = [
    "Asia/Seoul",
    "America/New_York",
    "Asia/Tokyo",
    "Europe/Berlin",
    "Europe/London",
  ] as const;

  const channelCount = 5;
  const createdChannels: IShoppingMallAiBackendChannel[] = [];
  for (let i = 0; i < channelCount; ++i) {
    const channelCreate = {
      code: `CH${RandomGenerator.alphaNumeric(6)}_${i}`,
      name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
      description: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      country: countryCodes[i],
      currency: currencyCodes[i],
      language: languageCodes[i],
      timezone: timezones[i],
    } satisfies IShoppingMallAiBackendChannel.ICreate;
    const channel =
      await api.functional.shoppingMallAiBackend.admin.channels.create(
        connection,
        {
          body: channelCreate,
        },
      );
    typia.assert(channel);
    createdChannels.push(channel);
  }

  // 3. Paginated search: fetch first page with limit=2
  const paginatedResult =
    await api.functional.shoppingMallAiBackend.admin.channels.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallAiBackendChannel.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination: current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit is 2",
    paginatedResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination: total records >= channelCount",
    paginatedResult.pagination.records >= channelCount,
  );
  TestValidator.predicate(
    "data count <= limit",
    paginatedResult.data.length <= 2,
  );

  // The paginated result should include some of the created channels
  const createdChannelIds = createdChannels.map((ch) => ch.id);
  TestValidator.predicate(
    "first paged result contains at least one created channel",
    paginatedResult.data.some((summary) =>
      createdChannelIds.includes(summary.id),
    ),
  );

  // 4. Search by a specific channel's name
  const sampleChannel = createdChannels[2]; // Use middle channel for variety

  // By name
  const byNameResult =
    await api.functional.shoppingMallAiBackend.admin.channels.index(
      connection,
      {
        body: {
          name: sampleChannel.name,
        } satisfies IShoppingMallAiBackendChannel.IRequest,
      },
    );
  typia.assert(byNameResult);
  TestValidator.predicate(
    "search by name finds only expected channels",
    byNameResult.data.every((summary) => summary.id === sampleChannel.id),
  );
  TestValidator.equals(
    "search by name contains expected channel only",
    byNameResult.data.length,
    1,
  );

  // By code
  const byCodeResult =
    await api.functional.shoppingMallAiBackend.admin.channels.index(
      connection,
      {
        body: {
          code: sampleChannel.code,
        } satisfies IShoppingMallAiBackendChannel.IRequest,
      },
    );
  typia.assert(byCodeResult);
  TestValidator.predicate(
    "search by code finds only expected channel",
    byCodeResult.data.every(
      (summary) =>
        summary.id === sampleChannel.id && summary.code === sampleChannel.code,
    ),
  );
  TestValidator.equals(
    "search by code contains expected channel only",
    byCodeResult.data.length,
    1,
  );

  // By country
  const byCountryResult =
    await api.functional.shoppingMallAiBackend.admin.channels.index(
      connection,
      {
        body: {
          country: sampleChannel.country,
        } satisfies IShoppingMallAiBackendChannel.IRequest,
      },
    );
  typia.assert(byCountryResult);
  // country search may get multiple, but must include our sample channel
  TestValidator.predicate(
    "search by country includes the sample channel",
    byCountryResult.data.some((summary) => summary.id === sampleChannel.id),
  );

  // 5. Optional: search with combined filters (country+currency)
  const byCountryAndCurrency =
    await api.functional.shoppingMallAiBackend.admin.channels.index(
      connection,
      {
        body: {
          country: sampleChannel.country,
          currency: sampleChannel.currency,
        } satisfies IShoppingMallAiBackendChannel.IRequest,
      },
    );
  typia.assert(byCountryAndCurrency);
  // Filtered: all returned must match country and currency
  TestValidator.predicate(
    "all filtered (country+currency) results match criteria",
    byCountryAndCurrency.data.every(
      (summary) =>
        summary.country === sampleChannel.country &&
        summary.currency === sampleChannel.currency,
    ),
  );
  // Should include our sample (since it's unique per test, at least our created one exists)
  TestValidator.predicate(
    "country+currency filter returns sample channel",
    byCountryAndCurrency.data.some(
      (summary) => summary.id === sampleChannel.id,
    ),
  );

  // (Optional extension) search for a country we know no created channel uses
  const missingCountry = "FR"; // Not in created sample list
  const missingCountryResult =
    await api.functional.shoppingMallAiBackend.admin.channels.index(
      connection,
      {
        body: {
          country: missingCountry,
        } satisfies IShoppingMallAiBackendChannel.IRequest,
      },
    );
  typia.assert(missingCountryResult);
  TestValidator.equals(
    "missing country yields 0 results",
    missingCountryResult.data.length,
    0,
  );
}
