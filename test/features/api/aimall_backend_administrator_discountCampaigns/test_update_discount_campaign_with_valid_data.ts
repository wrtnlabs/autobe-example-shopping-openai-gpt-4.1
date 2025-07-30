import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Test updating fields of an existing discount campaign with valid data.
 *
 * This scenario ensures an administrator can successfully update a discount
 * campaign's allowed fields:
 *
 * - Change display name
 * - Extend the end date
 * - Change stacking rules
 * - Update admin/business description
 *
 * The test first creates a discount campaign (as a prerequisite), then performs
 * an update by modifying several mutable fields. It asserts the changes take
 * effect and validates critical business properties:
 *
 * - Enforces that only permitted fields change
 * - Code uniqueness is maintained
 *
 * Steps:
 *
 * 1. Create a base discount campaign via admin API (capture all details as
 *    reference)
 * 2. Update campaign using its ID – change the name, update the end_at (extend),
 *    alter stackable, add/replace the description
 * 3. Assert the returned campaign object has new values for updated fields and
 *    unchanged values for non-updated fields
 * 4. Confirm that the discount campaign's code remains unique in the system
 *    (optionally – out of scope for update if not changed)
 *
 * Additional audit log checks are likely handled server-side; here, the focus
 * is on field/state correctness after mutation.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_test_update_discount_campaign_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign as precondition
  const baseCampaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph(1)(),
          code: RandomGenerator.alphaNumeric(8),
          type: "order",
          status: "active",
          stackable: true,
          start_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 hour
          end_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 day
          max_uses_per_user: typia.random<number & tags.Type<"int32">>(),
          priority: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph(1)(),
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(baseCampaign);

  // 2. Prepare update DTO: change name, extend end date, toggle stackable, update description
  const newName = RandomGenerator.paragraph(1)();
  const newEndAt = new Date(
    Date.parse(baseCampaign.end_at) + 24 * 60 * 60 * 1000,
  ).toISOString(); // extend +1 day
  const newStackable = !baseCampaign.stackable;
  const newDescription = RandomGenerator.paragraph(2)();

  const updateDto: IAimallBackendDiscountCampaign.IUpdate = {
    name: newName,
    end_at: newEndAt,
    stackable: newStackable,
    description: newDescription,
  };

  // 3. Update the campaign
  const updated =
    await api.functional.aimall_backend.administrator.discountCampaigns.update(
      connection,
      {
        discountCampaignId: baseCampaign.id,
        body: updateDto,
      },
    );
  typia.assert(updated);

  // 4. Validate updated fields
  TestValidator.equals("Campaign name updated")(updated.name)(newName);
  TestValidator.equals("Extended end date")(updated.end_at)(newEndAt);
  TestValidator.equals("Stackable modified")(updated.stackable)(newStackable);
  TestValidator.equals("Description modified")(updated.description)(
    newDescription,
  );

  // 5. Validate fields not updated remain unchanged
  TestValidator.equals("ID unchanged")(updated.id)(baseCampaign.id);
  TestValidator.equals("Code unchanged")(updated.code)(baseCampaign.code);
  TestValidator.equals("Type unchanged")(updated.type)(baseCampaign.type);
  TestValidator.equals("Status unchanged")(updated.status)(baseCampaign.status);
  TestValidator.equals("Start_at unchanged")(updated.start_at)(
    baseCampaign.start_at,
  );
  TestValidator.equals("Max uses per user unchanged")(
    updated.max_uses_per_user,
  )(baseCampaign.max_uses_per_user);
  TestValidator.equals("Priority unchanged")(updated.priority)(
    baseCampaign.priority,
  );
}
