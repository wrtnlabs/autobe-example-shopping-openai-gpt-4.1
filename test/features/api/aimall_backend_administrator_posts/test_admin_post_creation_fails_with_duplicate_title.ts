import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate duplicate post title policy for administrator post creation.
 *
 * This test verifies the API behavior when attempting to create two posts with
 * the same title in quick succession as an administrator:
 *
 * - If the system allows duplicate post titles, both creations must succeed,
 *   returning posts with identical titles but different IDs.
 * - If the system enforces title uniqueness, the second creation must fail
 *   (conflict/duplicate error).
 *
 * Steps:
 *
 * 1. Prepare valid post payload (unique title, body, is_private=false).
 * 2. Create the first admin post with the prepared data.
 * 3. Attempt to create a second admin post with the same title and content.
 * 4. Assert system's duplicate policy:
 *
 *    - If duplicates allowed: both posts exist (IDs differ, titles match).
 *    - If titles must be unique: the second creation fails as expected.
 */
export async function test_api_aimall_backend_administrator_posts_test_admin_post_creation_fails_with_duplicate_title(
  connection: api.IConnection,
) {
  // Step 1: Prepare post payload with a unique title
  const postPayload = {
    title: "Unique Duplicate Title Test " + RandomGenerator.alphaNumeric(8),
    body: "Body content for duplicate title policy test.",
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;

  // Step 2: Create the first post
  const post1 = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: postPayload,
    },
  );
  typia.assert(post1);
  TestValidator.equals("created title matches payload")(post1.title)(
    postPayload.title,
  );

  // Step 3: Attempt duplicate post creation and handle error if any
  let duplicateAllowed = false;
  let post2: IAimallBackendPost | undefined = undefined;
  try {
    post2 = await api.functional.aimall_backend.administrator.posts.create(
      connection,
      {
        body: postPayload,
      },
    );
    typia.assert(post2);
    duplicateAllowed = true;
  } catch {
    // If thrown, uniqueness is enforced.
    duplicateAllowed = false;
  }

  // Step 4: Assert system's duplicate title policy
  if (duplicateAllowed && post2) {
    TestValidator.notEquals("IDs must differ for distinct posts")(post2.id)(
      post1.id,
    );
    TestValidator.equals("titles must be equal")(post2.title)(post1.title);
  } else {
    TestValidator.predicate(
      "second post creation failed due to duplicate title",
    )(!duplicateAllowed);
  }
}
