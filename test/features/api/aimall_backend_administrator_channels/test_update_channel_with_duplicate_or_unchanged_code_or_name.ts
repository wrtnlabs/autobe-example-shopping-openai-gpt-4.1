import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";

/**
 * Validate API rejects update with duplicate or unchanged code/name across
 * channels
 *
 * This test ensures that updating a channel's code or name to a value already
 * used by another channel is correctly rejected by the API
 * (duplicate/uniqueness constraint), and also checks that updating with
 * unchanged values (self-no-op) is either a no-op or allowed without error (but
 * never triggers a duplicate validation error).
 *
 * Steps:
 *
 * 1. Create channelA (unique codeA, nameA)
 * 2. Create channelB (unique codeB, nameB)
 * 3. Try to update channelB's code to codeA (expect uniqueness error)
 * 4. Try to update channelB's name to nameA (expect uniqueness error)
 * 5. Update channelA with unchanged code and name (must NOT trigger error)
 * 6. Update channelB with unchanged code and name (must NOT trigger error)
 */
export async function test_api_aimall_backend_administrator_channels_test_update_channel_with_duplicate_or_unchanged_code_or_name(
  connection: api.IConnection,
) {
  // 1. Create channelA (unique codeA, nameA)
  const codeA = RandomGenerator.alphaNumeric(6);
  const nameA = RandomGenerator.alphaNumeric(10);
  const channelA =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: codeA,
          name: nameA,
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channelA);

  // 2. Create channelB (unique codeB, nameB)
  const codeB = RandomGenerator.alphaNumeric(6);
  const nameB = RandomGenerator.alphaNumeric(10);
  const channelB =
    await api.functional.aimall_backend.administrator.channels.create(
      connection,
      {
        body: {
          code: codeB,
          name: nameB,
          enabled: true,
        } satisfies IAimallBackendChannel.ICreate,
      },
    );
  typia.assert(channelB);

  // 3. Try to update channelB's code to codeA (expect code uniqueness error)
  await TestValidator.error("duplicate code update should fail")(() =>
    api.functional.aimall_backend.administrator.channels.update(connection, {
      channelId: channelB.id,
      body: { code: codeA } satisfies IAimallBackendChannel.IUpdate,
    }),
  );

  // 4. Try to update channelB's name to nameA (expect name uniqueness error)
  await TestValidator.error("duplicate name update should fail")(() =>
    api.functional.aimall_backend.administrator.channels.update(connection, {
      channelId: channelB.id,
      body: { name: nameA } satisfies IAimallBackendChannel.IUpdate,
    }),
  );

  // 5. Update channelA with unchanged code and name (should succeed, not error)
  const unchangedA =
    await api.functional.aimall_backend.administrator.channels.update(
      connection,
      {
        channelId: channelA.id,
        body: {
          code: codeA,
          name: nameA,
          enabled: channelA.enabled,
        } satisfies IAimallBackendChannel.IUpdate,
      },
    );
  typia.assert(unchangedA);
  TestValidator.equals("no change A id")(unchangedA.id)(channelA.id);
  TestValidator.equals("unchanged A code")(unchangedA.code)(codeA);
  TestValidator.equals("unchanged A name")(unchangedA.name)(nameA);
  TestValidator.equals("unchanged A enabled")(unchangedA.enabled)(
    channelA.enabled,
  );

  // 6. Update channelB with unchanged code and name (should succeed, not error)
  const unchangedB =
    await api.functional.aimall_backend.administrator.channels.update(
      connection,
      {
        channelId: channelB.id,
        body: {
          code: codeB,
          name: nameB,
          enabled: channelB.enabled,
        } satisfies IAimallBackendChannel.IUpdate,
      },
    );
  typia.assert(unchangedB);
  TestValidator.equals("no change B id")(unchangedB.id)(channelB.id);
  TestValidator.equals("unchanged B code")(unchangedB.code)(codeB);
  TestValidator.equals("unchanged B name")(unchangedB.name)(nameB);
  TestValidator.equals("unchanged B enabled")(unchangedB.enabled)(
    channelB.enabled,
  );
}
