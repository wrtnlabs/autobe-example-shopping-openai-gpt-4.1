import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Validate creation of a new discount campaign with all valid required and
 * optional fields.
 *
 * This test ensures admins can successfully create a campaign by providing all
 * schema-mandated and business-required fields:
 *
 * - Unique, programmatic campaign code
 * - Unique campaign name
 * - Valid type (e.g., 'order' or 'product'), status (e.g., 'active'), boolean
 *   stackability, integer priority
 * - Compliant ISO 8601 start_at/end_at range (start before end), positive/zero
 *   max_uses_per_user
 * - And description text (optional)
 *
 * Steps:
 *
 * 1. Construct valid input for all properties of
 *    IAimallBackendDiscountCampaign.ICreate
 * 2. Call the administrator campaign creation API endpoint with the payload
 * 3. Assert the response type matches IAimallBackendDiscountCampaign
 * 4. Validate output fields: name, code, type, status, stackable, start_at,
 *    end_at, priority, etc. must echo the input
 * 5. Check system has assigned a valid UUID as id
 * 6. Optionally: Confirm description is present when sent
 * 7. (If GET endpoint available) Retrieve the created campaign entity to ensure
 *    persistence
 * 8. (If possible) Confirm creation is logged in system audit/compliance log
 * 9. (Error edge case) Attempt to create campaign with duplicate code or invalid
 *    date range (start_at > end_at) and expect error
 *
 * Business context: Campaign creation is core for enabling or managing
 * discounts across the platform and must be robust, unique, and auditable.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_create(
  connection: api.IConnection,
) {
  // Step 1: Build valid input
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const input: IAimallBackendDiscountCampaign.ICreate = {
    name: `Test Campaign ${RandomGenerator.alphaNumeric(8)}`,
    code: `TEST${RandomGenerator.alphaNumeric(6)}`,
    type: RandomGenerator.pick(["order", "product"]),
    status: "active",
    stackable: true,
    start_at: start,
    end_at: end,
    max_uses_per_user: 5,
    priority: typia.random<number & tags.Type<"int32">>(),
    description: RandomGenerator.paragraph()(),
  };

  // Step 2: Create campaign
  const output =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: input },
    );
  typia.assert(output);

  // Step 3: Validate output fields echo input and have valid id
  TestValidator.equals("name")(output.name)(input.name);
  TestValidator.equals("code")(output.code)(input.code);
  TestValidator.equals("type")(output.type)(input.type);
  TestValidator.equals("status")(output.status)(input.status);
  TestValidator.equals("stackable")(output.stackable)(input.stackable);
  TestValidator.equals("start_at")(output.start_at)(input.start_at);
  TestValidator.equals("end_at")(output.end_at)(input.end_at);
  TestValidator.equals("max_uses_per_user")(output.max_uses_per_user)(
    input.max_uses_per_user,
  );
  TestValidator.equals("priority")(output.priority)(input.priority);
  TestValidator.equals("description")(output.description)(input.description);
  TestValidator.predicate("id is uuid")(
    !!output.id && /^[0-9a-fA-F\-]{36}$/.test(output.id),
  );

  // (Audit log and GET endpoint validation are skipped as no info)

  // Edge Case: Creating another campaign with duplicate code should fail
  await TestValidator.error("duplicate campaign code is rejected")(() =>
    api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: { ...input, name: input.name + " Again" } },
    ),
  );

  // Edge Case: Invalid date range (start_at > end_at) should fail
  await TestValidator.error("start_at later than end_at is rejected")(() =>
    api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          ...input,
          name: input.name + "2",
          code: input.code + "2",
          start_at: input.end_at,
          end_at: input.start_at,
        },
      },
    ),
  );
}
