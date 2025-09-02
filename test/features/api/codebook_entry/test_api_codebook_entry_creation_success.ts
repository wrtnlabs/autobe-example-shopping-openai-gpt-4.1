import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";

/**
 * E2E test for successful admin creation of a codebook entry.
 *
 * Steps:
 *
 * 1. Register a new admin using /auth/admin/join, collect credentials and
 *    authentication.
 * 2. Assume an existing codebookId (generate as fixture for the test).
 * 3. Using the authenticated admin, create a new codebook entry using POST
 *    /shoppingMallAiBackend/admin/codebooks/{codebookId}/entries.
 * 4. Confirm the entry is returned with correct code, label, uniqueness, and
 *    all evidence/audit fields set.
 * 5. Assert the codebookId matches, code/label/desc/order/visible match input,
 *    UUIDs and timestamps are valid, soft deletion is absent
 *    (null/undefined).
 */
export async function test_api_codebook_entry_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin (register and authenticate)
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminName: string = RandomGenerator.name(2);
  const adminPhone: string = RandomGenerator.mobile();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(60); // Placeholder for pre-hashed password

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // Auth token is now set on connection for admin

  // Step 2: Assume an existing codebookId (fixture - generate random UUID)
  const codebookId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Build input dto for codebook entry
  const input: IShoppingMallAiBackendCodebookEntry.ICreate = {
    code: RandomGenerator.alphaNumeric(6),
    label: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    order: typia.random<number & tags.Type<"int32">>(),
    visible: true,
  };

  // Step 4: Create entry as admin
  const output =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.create(
      connection,
      {
        codebookId: codebookId,
        body: input,
      },
    );
  typia.assert(output);

  // Step 5: Validate returned entry fields and correctness
  TestValidator.equals(
    "codebookId matches",
    output.shopping_mall_ai_backend_codebook_id,
    codebookId,
  );
  TestValidator.equals("code matches input", output.code, input.code);
  TestValidator.equals("label matches input", output.label, input.label);
  TestValidator.equals(
    "description matches input",
    output.description,
    input.description,
  );
  TestValidator.equals("order matches input", output.order, input.order);
  TestValidator.equals("visible matches input", output.visible, input.visible);
  TestValidator.predicate(
    "id is valid uuid",
    typeof output.id === "string" && output.id.length === 36,
  );
  TestValidator.predicate(
    "created_at timestamp present",
    typeof output.created_at === "string" && !!output.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp present",
    typeof output.updated_at === "string" && !!output.updated_at,
  );
  TestValidator.equals(
    "deleted_at not set (no soft deletion)",
    output.deleted_at,
    null,
  );
}
