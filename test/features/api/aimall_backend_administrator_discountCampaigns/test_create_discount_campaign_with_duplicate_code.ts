import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate failure when creating a discount campaign with a duplicate code.
 *
 * This test ensures that the API enforces the campaign code uniqueness
 * constraint when creating discount campaigns.
 *
 * Process:
 *
 * 1. Create an initial discount campaign with a unique code using valid campaign
 *    data (all required fields).
 * 2. Attempt to create a second discount campaign with a different name and
 *    campaign data, but using the same code as the first one.
 * 3. Validate that the second creation attempt fails due to the code uniqueness
 *    violation.
 *
 * Note: Verification of the original campaign's existence after the failure
 * attempt is not possible since there is no lookup/query API information
 * provided.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_create_discount_campaign_with_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create an initial discount campaign with a unique code
  const uniqueCode: string = RandomGenerator.alphaNumeric(12);
  const createInput: IAimallBackendDiscountCampaign.ICreate = {
    name: RandomGenerator.paragraph()(1),
    code: uniqueCode,
    type: "order",
    status: "active",
    stackable: true,
    start_at: new Date(Date.now() + 10000).toISOString(),
    end_at: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    max_uses_per_user: 5,
    priority: 10,
    description: RandomGenerator.paragraph()(),
  };
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: createInput },
    );
  typia.assert(campaign);
  TestValidator.equals("campaign code matches")(campaign.code)(uniqueCode);

  // 2. Attempt to create another campaign with the same code (should fail)
  const duplicateInput: IAimallBackendDiscountCampaign.ICreate = {
    name: RandomGenerator.paragraph()(1),
    code: uniqueCode,
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date(Date.now() + 20000).toISOString(),
    end_at: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
    max_uses_per_user: 10,
    priority: 15,
    description: RandomGenerator.paragraph()(),
  };
  await TestValidator.error("should fail to create duplicate campaign code")(
    () =>
      api.functional.aimall_backend.administrator.discountCampaigns.create(
        connection,
        { body: duplicateInput },
      ),
  );

  // 3. (Optional, not implemented) Re-validate first campaign record (not possible with given API docs)
}
