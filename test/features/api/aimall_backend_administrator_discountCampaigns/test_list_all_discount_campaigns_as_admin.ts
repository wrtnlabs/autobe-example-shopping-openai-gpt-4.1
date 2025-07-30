import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendDiscountCampaign";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate administrator retrieval of all discount campaigns and test for
 * correct population and normalization.
 *
 * This test ensures that an admin user can retrieve a complete list of discount
 * campaigns. If there are no campaigns, it first creates several distinct
 * campaigns to guarantee there will be new records. It then retrieves the
 * campaigns list and checks that all just-created campaigns are present, with
 * correct values for key audit fields (code, name, status, start/end dates,
 * stackable flag, priority, etc). Data integrity and normalization of the
 * returned records are validated. This verifies both business requirements
 * (admin-only access, correct audit metadata) and endpoint correctness.
 *
 * 1. Create multiple (e.g., 3) discount campaigns with unique codes/names.
 * 2. Call administrator list endpoint for all discount campaigns.
 * 3. Confirm newly created campaigns are present in the response.
 * 4. For each campaign, validate code, name, type, status, stackable, start/end
 *    dates, priority, and normalization.
 * 5. TestValidator asserts array presence, property population, and uniqueness of
 *    code/name.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_index(
  connection: api.IConnection,
) {
  // Step 1: Create 3 discount campaigns with unique codes/names
  const campaignsToCreate: IAimallBackendDiscountCampaign.ICreate[] =
    ArrayUtil.repeat(3)((i) => ({
      name: `E2E Test Campaign ${RandomGenerator.alphabets(5)}_${i}`,
      code: `E2E_CODE_${RandomGenerator.alphaNumeric(6)}_${i}`,
      type: RandomGenerator.pick(["order", "product"]),
      status: RandomGenerator.pick(["active", "inactive", "ended"]),
      stackable: i % 2 === 0,
      start_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * i).toISOString(),
      end_at: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * (i + 7),
      ).toISOString(),
      max_uses_per_user: i + 1,
      priority: 10 + i,
      description: `Description for Campaign ${i}`,
    }));

  const createdCampaigns: IAimallBackendDiscountCampaign[] = [];
  for (const campaign of campaignsToCreate) {
    const created =
      await api.functional.aimall_backend.administrator.discountCampaigns.create(
        connection,
        { body: campaign },
      );
    typia.assert(created);
    createdCampaigns.push(created);
  }

  // Step 2: Retrieve all discount campaigns as admin
  const output: IPageIAimallBackendDiscountCampaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.index(
      connection,
    );
  typia.assert(output);
  TestValidator.predicate("paginated campaigns present")(
    output.pagination.records >= createdCampaigns.length,
  );
  TestValidator.predicate("campaign array not empty")(output.data.length > 0);

  // Step 3 & 4: Validate all created campaigns appear with correct key fields
  for (const created of createdCampaigns) {
    const match = output.data.find((c) => c.code === created.code);
    TestValidator.predicate(`campaign with code ${created.code} exists`)(
      !!match,
    );
    if (match) {
      TestValidator.equals("name")(match.name)(created.name);
      TestValidator.equals("status")(match.status)(created.status);
      TestValidator.equals("type")(match.type)(created.type);
      TestValidator.equals("stackable")(match.stackable)(created.stackable);
      TestValidator.equals("priority")(match.priority)(created.priority);
      TestValidator.equals("date start")(match.start_at)(created.start_at);
      TestValidator.equals("date end")(match.end_at)(created.end_at);
      if (created.max_uses_per_user !== undefined)
        TestValidator.equals("max uses per user")(match.max_uses_per_user)(
          created.max_uses_per_user,
        );
      if (created.description !== undefined)
        TestValidator.equals("description")(match.description)(
          created.description,
        );
      TestValidator.predicate("id is uuid")(
        !!match.id && match.id.length === 36 && match.id.includes("-"),
      );
    }
  }
}
