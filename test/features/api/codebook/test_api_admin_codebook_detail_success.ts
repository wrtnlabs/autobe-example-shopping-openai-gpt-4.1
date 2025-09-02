import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";

export async function test_api_admin_codebook_detail_success(
  connection: api.IConnection,
) {
  /**
   * This test validates that an admin can successfully retrieve a single
   * codebook by its codebookId.
   *
   * Business context:
   *
   * - Only an authenticated admin can access the codebook detail endpoint.
   * - The codebook must exist before it can be fetched; thus, we first register
   *   as an admin, create a new codebook to obtain its UUID, and then retrieve
   *   its detail.
   *
   * Steps:
   *
   * 1. Register an admin account (required for authentication and authorization
   *    for all following admin actions)
   * 2. Create a new codebook via POST /shoppingMallAiBackend/admin/codebooks
   * 3. Use the returned id (codebookId) to fetch its details with GET
   *    /shoppingMallAiBackend/admin/codebooks/{codebookId}
   * 4. Assert all codebook properties in the response match the codebook that was
   *    created (except for timestamps and server-side generated fields)
   * 5. Confirm record is accessible (not soft deleted) and assigned values are as
   *    expected.
   */

  // Step 1: Register admin
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminPassword = RandomGenerator.alphaNumeric(15);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@test-admin.com`;
  const adminName = RandomGenerator.name(2);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // Test env; in production, hash first.
      name: adminName,
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin username matches",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches",
    adminJoin.admin.email,
    adminEmail,
  );
  TestValidator.equals("admin is_active=true", adminJoin.admin.is_active, true);

  // Step 2: Create a codebook
  const codeValue = RandomGenerator.alphaNumeric(8);
  const codebookInput: IShoppingMallAiBackendCodebook.ICreate = {
    code: codeValue,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const createdCodebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: codebookInput,
      },
    );
  typia.assert(createdCodebook);
  TestValidator.equals(
    "created codebook code matches",
    createdCodebook.code,
    codebookInput.code,
  );
  TestValidator.equals(
    "created codebook name matches",
    createdCodebook.name,
    codebookInput.name,
  );
  TestValidator.equals(
    "created codebook description matches",
    createdCodebook.description,
    codebookInput.description,
  );
  TestValidator.equals(
    "created codebook deleted_at should be null",
    createdCodebook.deleted_at,
    null,
  );

  // Step 3: Fetch codebook details
  const fetchedCodebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.at(connection, {
      codebookId: createdCodebook.id,
    });
  typia.assert(fetchedCodebook);

  // Step 4: Assert fetched and created match
  TestValidator.equals(
    "fetched codebook id matches created",
    fetchedCodebook.id,
    createdCodebook.id,
  );
  TestValidator.equals(
    "fetched codebook code matches input",
    fetchedCodebook.code,
    codebookInput.code,
  );
  TestValidator.equals(
    "fetched codebook name matches input",
    fetchedCodebook.name,
    codebookInput.name,
  );
  TestValidator.equals(
    "fetched codebook description matches input",
    fetchedCodebook.description,
    codebookInput.description,
  );
  TestValidator.equals(
    "fetched codebook deleted_at should be null",
    fetchedCodebook.deleted_at,
    null,
  );

  // Extra business validation
  TestValidator.predicate(
    "fetched codebook is accessible (not soft deleted)",
    fetchedCodebook.deleted_at === null,
  );
}
