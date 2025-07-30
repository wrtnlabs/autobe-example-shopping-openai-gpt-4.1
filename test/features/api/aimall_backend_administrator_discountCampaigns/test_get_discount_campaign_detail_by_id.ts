import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate retrieval of discount campaign details by ID.
 *
 * This test covers the administrative workflow for fetching a single discount
 * campaign record by its UUID. It ensures the response matches all configured
 * properties and validates error handling for non-existent IDs.
 *
 * Business workflow:
 *
 * 1. Create a new discount campaign in the admin role.
 * 2. Retrieve the campaign details by its assigned UUID via the get endpoint.
 * 3. Assert that all properties match (name, code, type, dates, stacking rules,
 *    priority, etc.).
 * 4. Attempt to retrieve a campaign by a random (non-existent) UUID and expect an
 *    error.
 *
 * Only administrators should be able to perform this operation; test assumes
 * authorized admin connection context.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_get_discount_campaign_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Create a campaign for lookup
  const campaignInput: IAimallBackendDiscountCampaign.ICreate = {
    name: "SUMMER PROMO " + RandomGenerator.alphaNumeric(5),
    code: "SUMMERCAMP" + RandomGenerator.alphaNumeric(3),
    type: "order",
    status: "active",
    stackable: true,
    start_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    max_uses_per_user: 5,
    priority: 2,
    description: "Automated campaign for detailed view tests.",
  };
  const created =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(created);

  // 2. Fetch the campaign by its ID
  const fetched =
    await api.functional.aimall_backend.administrator.discountCampaigns.at(
      connection,
      { discountCampaignId: created.id },
    );
  typia.assert(fetched);

  // 3. Compare all public properties
  TestValidator.equals("id")(fetched.id)(created.id);
  TestValidator.equals("name")(fetched.name)(created.name);
  TestValidator.equals("code")(fetched.code)(created.code);
  TestValidator.equals("type")(fetched.type)(created.type);
  TestValidator.equals("status")(fetched.status)(created.status);
  TestValidator.equals("stackable")(fetched.stackable)(created.stackable);
  TestValidator.equals("start_at")(fetched.start_at)(created.start_at);
  TestValidator.equals("end_at")(fetched.end_at)(created.end_at);
  TestValidator.equals("max_uses_per_user")(fetched.max_uses_per_user)(
    created.max_uses_per_user,
  );
  TestValidator.equals("priority")(fetched.priority)(created.priority);
  TestValidator.equals("description")(fetched.description)(created.description);

  // 4. Try retrieving a non-existent campaign (should error)
  await TestValidator.error("404 when discount campaign does not exist")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.at(
        connection,
        {
          discountCampaignId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
