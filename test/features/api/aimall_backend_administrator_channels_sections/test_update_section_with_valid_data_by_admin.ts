import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate that an administrator can update all mutable fields of a section
 * entity within a channel.
 *
 * Business context: Sections are organizational units within a channel. Each
 * has a code, display name, display order, and enabled flag. Only those fields
 * are mutable on update. Audit fields and foreign keys must not be changed.
 *
 * Workflow:
 *
 * 1. Provision a new channel using the admin API.
 * 2. Create a section under the channel; record its details.
 * 3. Prepare an update payload that modifies the 'name', 'code', 'display_order',
 *    and 'enabled' fields, each with new values.
 * 4. Invoke the update API with the channelId/sectionId and payload.
 * 5. Confirm the response contains all updates, while immutable fields remain
 *    unchanged.
 * 6. Validate audit timestamps are refreshed appropriately and no forbidden fields
 *    are impacted.
 * 7. Optionally, trigger error if update with illegal/immutable field attempted
 *    (but per API and types, only permitted fields are allowed in input).
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_update_section_with_valid_data_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new channel to hold section(s)
  const channelInput: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph()(1),
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 2. Create a new section under the channel
  const sectionInput: IAimallBackendSection.ICreate = {
    channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.paragraph()(1),
    display_order: typia.random<number & tags.Type<"int32">>(),
    enabled: true,
  };
  const section =
    await api.functional.aimall_backend.administrator.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 3. Prepare update for all mutable fields
  const updatePayload: IAimallBackendSection.IUpdate = {
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.paragraph()(1),
    display_order: section.display_order + 1,
    enabled: !section.enabled,
  };

  // 4. Update the section with new values
  const updated =
    await api.functional.aimall_backend.administrator.channels.sections.update(
      connection,
      {
        channelId: channel.id,
        sectionId: section.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);

  // 5. Validate that all mutable fields are updated accordingly
  TestValidator.equals("code updated")(updated.code)(updatePayload.code);
  TestValidator.equals("name updated")(updated.name)(updatePayload.name);
  TestValidator.equals("display_order updated")(updated.display_order)(
    updatePayload.display_order,
  );
  TestValidator.equals("enabled flag updated")(updated.enabled)(
    updatePayload.enabled,
  );
  // 6. Confirm that immutable fields are unchanged
  TestValidator.equals("channel_id")(updated.channel_id)(section.channel_id);
  TestValidator.equals("section id")(updated.id)(section.id);
  // 7. Confirm audit timestamps: updated_at must change, created_at must not
  TestValidator.predicate("updated_at refreshed")(
    new Date(updated.updated_at).getTime() >
      new Date(section.updated_at).getTime(),
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    section.created_at,
  );
  // 8. Confirm soft-delete field remains consistent
  TestValidator.equals("deleted_at unchanged")(updated.deleted_at)(
    section.deleted_at ?? null,
  );
}
