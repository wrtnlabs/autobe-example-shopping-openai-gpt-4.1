import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate the creation (upload) of a snapshot attached to a community post by
 * a customer.
 *
 * Business context: Customers should be able to attach (upload) media snapshots
 * to their community posts, provided all validation rules on the API and schema
 * are satisfied. Snapshots can be images, videos, etc., and must be correctly
 * linked to their parent post. The test covers both successful operations and
 * various failure/edge cases to ensure robust input handling and permission
 * enforcement.
 *
 * Steps:
 *
 * 1. Create a new post using the customer API.
 * 2. Upload a valid snapshot to the new post:
 *
 *    - Use a realistic media_uri, include a (random) caption.
 *    - Omit optional fields (see schema rules) and test autogeneration/defaulting.
 *    - Assert the returned snapshot links to the correct post, has expected fields,
 *         and matches request input.
 * 3. Negative/invalid tests:
 *
 *    - Attempt snapshot creation with missing/invalid media_uri (should fail schema
 *         validation).
 *    - Attempt to attach snapshot to a non-existent post (should fail with error).
 *    - Attempt to upload with empty/invalid media_uri (should fail schema
 *         validation).
 *    - Other business-logic negatives (caption limits, duplicate upload,
 *         unauthorized) omitted as not implementable with current schema.
 *
 * All responses should be asserted with typia.assert and logical
 * validation/assertions, with error paths validated that an exception/error is
 * thrown for invalid cases (using TestValidator.error). Only schema-covered
 * negative tests are implemented if details are unclear.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_customer_can_create_snapshot_for_post_and_handle_invalid_conditions(
  connection: api.IConnection,
) {
  // 1. Create parent post using the customer API
  const newPost = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.content()()(16),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(newPost);

  // 2. Upload a valid snapshot with required fields (media_uri, link to post)
  const snapshotInput = {
    post_id: newPost.id,
    media_uri: typia.random<string & tags.Format<"uri">>(),
    caption: RandomGenerator.paragraph()(1),
  } satisfies IAimallBackendSnapshot.ICreate;
  const validSnapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: newPost.id,
        body: snapshotInput,
      },
    );
  typia.assert(validSnapshot);
  TestValidator.equals("linked to right post")(validSnapshot.post_id)(
    newPost.id,
  );
  TestValidator.equals("media_uri matches")(validSnapshot.media_uri)(
    snapshotInput.media_uri,
  );
  if (snapshotInput.caption !== undefined)
    TestValidator.equals("caption matches")(validSnapshot.caption)(
      snapshotInput.caption,
    );

  // 3a. Attempt to upload snapshot with missing required media_uri (should error)
  await TestValidator.error("missing media_uri fails")(() =>
    api.functional.aimall_backend.customer.posts.snapshots.create(connection, {
      postId: newPost.id,
      body: {
        post_id: newPost.id,
        // media_uri intentionally omitted
      } as any,
    }),
  );

  // 3b. Attempt to attach snapshot to a non-existent post
  await TestValidator.error("non-existent post_id fails")(() =>
    api.functional.aimall_backend.customer.posts.snapshots.create(connection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        media_uri: typia.random<string & tags.Format<"uri">>(),
      } satisfies IAimallBackendSnapshot.ICreate,
    }),
  );

  // 3c. Attempt to upload with empty or invalid media_uri
  await TestValidator.error("invalid media_uri fails")(() =>
    api.functional.aimall_backend.customer.posts.snapshots.create(connection, {
      postId: newPost.id,
      body: {
        post_id: newPost.id,
        media_uri: "", // empty string invalid
      } satisfies IAimallBackendSnapshot.ICreate,
    }),
  );

  // 3d. Other negative (business logic, caption, duplicate) cases omitted as schema/API doesn't specify constraints.
}
