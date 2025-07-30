import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IAimallBackendSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSection";

/**
 * Validate the retrieval of a section's detail information by administrator.
 *
 * This test checks that after creating a new channel and adding a section to
 * it, the detail retrieval endpoint returns the exact section information
 * matching what was initially set. The goal is to verify correct linkage of
 * channel/section and field accuracy in the detail, as well as backend
 * consistency and field assignment.
 *
 * 1. Provision a new channel with a unique code and name.
 * 2. Under that channel, create a new section with unique code, display name,
 *    enabled flag, and a display order.
 * 3. Immediately fetch the section's detail using the returned channelId and
 *    sectionId.
 * 4. Validate that all fields in the detail response align with values used at
 *    creation, including linkage (channelId matches), code, name,
 *    display_order, and enabled. Confirm timestamp fields are populated and the
 *    section is not soft-deleted.
 */
export async function test_api_aimall_backend_administrator_channels_sections_test_get_section_detail_success(
  connection: api.IConnection,
) {
  // 1. Create a channel to serve as the parent. Generate unique code and name.
  const channelInput: IAimallBackendChannel.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.alphabets(8),
    enabled: true,
  };
  const channel =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      { body: channelInput },
    );
  typia.assert(channel);

  // 2. Create a section under this channel with a specific code, name, display order, and enabled flag
  const sectionInput: IAimallBackendSection.ICreate = {
    channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.alphabets(10),
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

  // 3. Retrieve the section detail by channelId and sectionId
  const detail =
    await api.functional.aimall_backend.administrator.channels.sections.at(
      connection,
      {
        channelId: channel.id,
        sectionId: section.id,
      },
    );
  typia.assert(detail);

  // 4. Validate returned section matches expected values
  TestValidator.equals("channel linkage")(detail.channel_id)(channel.id);
  TestValidator.equals("section id")(detail.id)(section.id);
  TestValidator.equals("code")(detail.code)(sectionInput.code);
  TestValidator.equals("name")(detail.name)(sectionInput.name);
  TestValidator.equals("display_order")(detail.display_order)(
    sectionInput.display_order,
  );
  TestValidator.equals("enabled")(detail.enabled)(sectionInput.enabled);
  TestValidator.predicate("has created_at")(!!detail.created_at);
  TestValidator.predicate("has updated_at")(!!detail.updated_at);
  TestValidator.equals("not soft-deleted")(detail.deleted_at)(null);
}
