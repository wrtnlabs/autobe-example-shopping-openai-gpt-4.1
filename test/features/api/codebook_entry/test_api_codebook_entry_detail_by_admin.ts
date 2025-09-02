import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import type { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";

export async function test_api_codebook_entry_detail_by_admin(
  connection: api.IConnection,
) {
  /**
   * Validate the retrieval of codebook entry details for an admin user by
   * entryId and codebookId.
   *
   * 1. Register and authenticate a new admin account.
   * 2. Create a new codebook and extract its UUID.
   * 3. Add a new entry to the codebook and extract the entry's UUID.
   * 4. Retrieve the codebook entry by codebookId and entryId as the admin.
   * 5. Validate that the codebookId and entryId in the response match the expected
   *    values and that all business/context metadata fields (code, label,
   *    order, visible, timestamps, association fields) are properly returned.
   */

  // Step 1: Register and authenticate an admin
  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);
  const admin = adminJoinResult.admin;

  // Step 2: Create a new codebook and extract its UUID
  const codebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(codebook);
  const codebookId = codebook.id;

  // Step 3: Add a new entry to the codebook and extract entry's UUID
  const entry =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.create(
      connection,
      {
        codebookId,
        body: {
          code: RandomGenerator.alphaNumeric(6),
          label: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph(),
          order: 1,
          visible: true,
        } satisfies IShoppingMallAiBackendCodebookEntry.ICreate,
      },
    );
  typia.assert(entry);
  const entryId = entry.id;
  TestValidator.equals(
    "entry is assigned to codebook",
    entry.shopping_mall_ai_backend_codebook_id,
    codebookId,
  );

  // Step 4: Retrieve entry details by codebookId and entryId
  const detailedEntry =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.at(
      connection,
      {
        codebookId,
        entryId,
      },
    );
  typia.assert(detailedEntry);

  // Step 5: Validate returned detail data matches expectations
  TestValidator.equals(
    "detailed entry id matches created entry id",
    detailedEntry.id,
    entryId,
  );
  TestValidator.equals(
    "detailed entry codebook association matches",
    detailedEntry.shopping_mall_ai_backend_codebook_id,
    codebookId,
  );
  TestValidator.equals(
    "detailed entry code matches",
    detailedEntry.code,
    entry.code,
  );
  TestValidator.equals(
    "detailed entry label matches",
    detailedEntry.label,
    entry.label,
  );
  TestValidator.equals(
    "detailed entry description matches",
    detailedEntry.description,
    entry.description,
  );
  TestValidator.equals(
    "detailed entry order matches",
    detailedEntry.order,
    entry.order,
  );
  TestValidator.equals(
    "detailed entry visible matches",
    detailedEntry.visible,
    entry.visible,
  );
  TestValidator.predicate(
    "detailed entry created_at is ISO date-time",
    typeof detailedEntry.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        detailedEntry.created_at,
      ),
  );
  TestValidator.predicate(
    "detailed entry updated_at is ISO date-time",
    typeof detailedEntry.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        detailedEntry.updated_at,
      ),
  );
}
