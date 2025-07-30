import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";
import type { IPageIAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching and filtering for channel sections with pagination and
 * specific filter criteria.
 *
 * This test creates a new channel and multiple sections under it with different
 * codes, names, display orders, and enabled flags. Then, it exercises the PATCH
 * /aimall-backend/administrator/channels/{channelId}/sections endpoint:
 *
 * 1. Create a new channel for use during this test
 * 2. Create several sections under that channel, each with unique values for code,
 *    name, display_order, and enabled
 * 3. Search by code – issue a search query with a specific known code; assert only
 *    that section is returned and data matches filter
 * 4. Search by name – use a partial or full name filter and assert correct results
 * 5. Filter by enabled – request only enabled (true) or only disabled (false)
 *    sections, and verify results
 * 6. Test with pagination – request a limited page and assert only the correct
 *    subset is returned with correct pagination metadata
 * 7. Optionally, combine filters (e.g., code + enabled, or name + pagination)
 *
 * Each assertion checks that the API response only contains sections that
 * exactly match the filter(s), and that pagination fields are correct.
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_search_sections_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // Step 1: Create a new channel
  const channelInput: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph()(1),
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // Step 2: Create several sections with unique combinations
  const sectionInputs: IAimallBackendSection.ICreate[] = [
    {
      channel_id: channel.id,
      code: "SECA",
      name: "Banner",
      display_order: 10,
      enabled: true,
    },
    {
      channel_id: channel.id,
      code: "SECB",
      name: "Featured",
      display_order: 20,
      enabled: false,
    },
    {
      channel_id: channel.id,
      code: "SECC",
      name: "Blocks",
      display_order: 30,
      enabled: true,
    },
    {
      channel_id: channel.id,
      code: "SECD",
      name: "Promo",
      display_order: 40,
      enabled: false,
    },
  ];
  const createdSections: IAimallBackendSection[] = [];
  for (const input of sectionInputs) {
    const section =
      await api.functional.aimall_backend.administrator.channels.sections.create(
        connection,
        { channelId: channel.id, body: input },
      );
    typia.assert(section);
    createdSections.push(section);
  }

  // Step 3: Search by code (should return exactly one)
  {
    const code = sectionInputs[2].code;
    const res =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { code } },
      );
    typia.assert(res);
    TestValidator.equals("Match single by code")(res.data.length)(1);
    TestValidator.equals("Correct code")(res.data[0].code)(code);
  }

  // Step 4: Search by name (should match all with full/partial match)
  {
    // Assume "Banner" will be unique here. Full match.
    const name = sectionInputs[0].name;
    const res =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { name } },
      );
    typia.assert(res);
    for (const s of res.data)
      TestValidator.equals("Name matches")(s.name)(name);
  }

  // Step 5: Filter by enabled=true
  {
    const res =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { enabled: true } },
      );
    typia.assert(res);
    for (const s of res.data)
      TestValidator.equals("Enabled only")(s.enabled)(true);
  }
  // Step 5b: Filter by enabled=false
  {
    const res =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { enabled: false } },
      );
    typia.assert(res);
    for (const s of res.data)
      TestValidator.equals("Disabled only")(s.enabled)(false);
  }

  // Step 6: Pagination (e.g., limit 2, get first/second page, check current & page size)
  {
    const limit = 2;
    const first =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { limit, page: 1 } },
      );
    typia.assert(first);
    TestValidator.equals("First page size")(first.data.length)(limit);
    TestValidator.equals("Current page")(first.pagination.current)(1);
    TestValidator.equals("Limit")(first.pagination.limit)(limit);
    // Get second page, check that data is not the same as first
    const second =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { limit, page: 2 } },
      );
    typia.assert(second);
    TestValidator.equals("Second page size")(second.data.length)(
      sectionInputs.length - limit < limit
        ? sectionInputs.length - limit
        : limit,
    );
    TestValidator.notEquals("Page data doesn't overlap")(
      first.data.map((x) => x.id),
    )(second.data.map((x) => x.id));
  }

  // Step 7: Combined filters (e.g., code + enabled)
  {
    // code = SECB, enabled = false
    const code = sectionInputs[1].code;
    const res =
      await api.functional.aimall_backend.administrator.channels.sections.search(
        connection,
        { channelId: channel.id, body: { code, enabled: false } },
      );
    typia.assert(res);
    TestValidator.equals("Combined filters")(res.data.length)(1);
    TestValidator.equals("Correct code")(res.data[0].code)(code);
    TestValidator.equals("Enabled is false")(res.data[0].enabled)(false);
  }
}
