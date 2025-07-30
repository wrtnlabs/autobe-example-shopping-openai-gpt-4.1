import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate updating mutable metadata (caption, media_uri) of a community
 * snapshot as administrator.
 *
 * Business context: Allow admins to make corrections or updates to snapshot
 * metadata while ensuring immutability of other fields.
 *
 * Steps:
 *
 * 1. Create a random initial snapshot using the create endpoint (POST
 *    /aimall-backend/administrator/snapshots).
 * 2. Make note of all original values and its ID.
 * 3. Update one or both mutable fields (caption, media_uri) via PUT
 *    /aimall-backend/administrator/snapshots/{snapshotId}, using valid new
 *    values.
 * 4. Assert that the returned snapshot has the updated caption/media_uri and the
 *    other fields are unchanged (id and any immutable linkage fields).
 * 5. If possible, check (through re-GET or output) that a modification timestamp
 *    was updated or that the updated fields persist in subsequent queries.
 * 6. Optionally, test partial update: update only the caption (not media_uri) and
 *    confirm only it has changed.
 */
export async function test_api_aimall_backend_administrator_snapshots_test_update_snapshot_successful_mutable_fields(
  connection: api.IConnection,
) {
  // 1. Create a new snapshot with all possible fields set
  const original: IAimallBackendSnapshot =
    await api.functional.aimall_backend.administrator.snapshots.create(
      connection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          post_id: typia.random<string & tags.Format<"uuid">>(),
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          media_uri: RandomGenerator.alphaNumeric(18),
          caption: RandomGenerator.paragraph()(1),
          created_at: new Date().toISOString(),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(original);

  // 2. Update both mutable fields (caption and media_uri)
  const newCaption = RandomGenerator.paragraph()(2);
  const newMediaUri = RandomGenerator.alphaNumeric(24);
  const updated: IAimallBackendSnapshot =
    await api.functional.aimall_backend.administrator.snapshots.update(
      connection,
      {
        snapshotId: original.id,
        body: {
          caption: newCaption,
          media_uri: newMediaUri,
        } satisfies IAimallBackendSnapshot.IUpdate,
      },
    );
  typia.assert(updated);

  // 3. Confirm returned snapshot has changed mutable fields but unchanged immutable fields
  TestValidator.equals("id unchanged")(updated.id)(original.id);
  TestValidator.equals("product_id unchanged")(updated.product_id)(
    original.product_id,
  );
  TestValidator.equals("post_id unchanged")(updated.post_id)(original.post_id);
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    original.customer_id,
  );
  TestValidator.equals("caption updated")(updated.caption)(newCaption);
  TestValidator.equals("media_uri updated")(updated.media_uri)(newMediaUri);
  TestValidator.notEquals("created_at possibly updated?")(updated.created_at)(
    original.created_at,
  );

  // 4. Optionally, perform another update (only caption)
  const finalCaption = RandomGenerator.paragraph()(1);
  const updatedAgain: IAimallBackendSnapshot =
    await api.functional.aimall_backend.administrator.snapshots.update(
      connection,
      {
        snapshotId: original.id,
        body: {
          caption: finalCaption,
        } satisfies IAimallBackendSnapshot.IUpdate,
      },
    );
  typia.assert(updatedAgain);
  TestValidator.equals("caption updated again")(updatedAgain.caption)(
    finalCaption,
  );
  TestValidator.equals("media_uri unchanged after second update")(
    updatedAgain.media_uri,
  )(newMediaUri);
}
