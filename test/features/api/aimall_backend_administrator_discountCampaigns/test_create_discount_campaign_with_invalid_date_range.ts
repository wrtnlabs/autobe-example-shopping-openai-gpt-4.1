import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate error on attempting to create a discount campaign where the start
 * date is after the end date.
 *
 * According to business requirements, a discount campaign should have a start
 * date (`start_at`) that is before or equal to its end date (`end_at`). This
 * test ensures that the API enforces this validation rule and returns an error
 * (typically a validation error) when `start_at` > `end_at`.
 *
 * Test Procedure:
 *
 * 1. Attempt to create a discount campaign providing all required fields, but
 *    intentionally set `start_at` to a date/time AFTER `end_at`.
 * 2. Expect the API to reject the request and throw a validation error, not
 *    creating the campaign.
 * 3. Confirm via TestValidator.error that an error is thrown for this invalid
 *    input.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_create_discount_campaign_with_invalid_date_range(
  connection: api.IConnection,
) {
  // 1. Prepare the test campaign data with start_at > end_at
  const now = new Date();
  const start_at = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 2,
  ).toISOString(); // 2 days in the future
  const end_at = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 1 day in the future
  const createDto = {
    name: `Invalid Date Range Campaign ${now.getTime()}`,
    code: `INVALID-DATE-${now.getTime()}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at,
    end_at,
    priority: 1,
    description: "Testing invalid date range (start_at > end_at)",
    max_uses_per_user: 1,
  } satisfies IAimallBackendDiscountCampaign.ICreate;

  // 2. Attempt creation and expect a validation error
  await TestValidator.error("creation fails on invalid date range")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.create(
        connection,
        { body: createDto },
      );
    },
  );
}
