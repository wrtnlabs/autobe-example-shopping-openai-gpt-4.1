import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";

export async function test_api_admin_file_metadata_creation_and_duplicate_uri(
  connection: api.IConnection,
) {
  /**
   * Validate admin-level file metadata creation including success, duplicate
   * error, and validation errors.
   *
   * This test registers and authenticates an admin, then attempts to create a
   * file metadata record as admin with valid input. It then confirms uniqueness
   * constraint on storage_uri triggers an error, and also covers examples of
   * required field absence and invalid field types triggering validation
   * errors.
   *
   * 1. Register and authenticate admin (required for further operations).
   * 2. Create new file metadata with all required fields (success).
   * 3. Attempt to create a second file metadata with the same storage_uri (expect
   *    error).
   * 4. Attempt to create a file metadata with missing required field (expect
   *    validation error).
   * 5. Attempt to create a file metadata with invalid field type (expect
   *    validation error).
   */

  // 1. Admin registration and authentication
  const adminUsername: string = RandomGenerator.alphaNumeric(12);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminName: string = RandomGenerator.name();
  const adminPasswordHash: string = RandomGenerator.alphaNumeric(32); // already a hash simulation
  const adminPhone: string = RandomGenerator.mobile();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
      phone_number: adminPhone,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  const adminId: string = adminJoin.admin.id;

  // 2. Create new file metadata (success)
  const uniqueStorageUri = `s3://bucket/${RandomGenerator.alphaNumeric(30)}`;
  const now = new Date().toISOString();
  const fileMeta: IShoppingMallAiBackendFile.ICreate = {
    original_filename: `${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}.png`,
    mime_type: "image/png",
    storage_uri: uniqueStorageUri,
    size_bytes: 2048,
    uploaded_by_id: adminId,
    uploaded_at: now,
  };
  const created = await api.functional.shoppingMallAiBackend.admin.files.create(
    connection,
    {
      body: fileMeta,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "original filename matches input",
    created.original_filename,
    fileMeta.original_filename,
  );
  TestValidator.equals(
    "mime type matches input",
    created.mime_type,
    fileMeta.mime_type,
  );
  TestValidator.equals(
    "storage uri matches input",
    created.storage_uri,
    fileMeta.storage_uri,
  );
  TestValidator.equals(
    "size_bytes matches input",
    created.size_bytes,
    fileMeta.size_bytes,
  );
  TestValidator.equals(
    "uploaded_by_id matches input",
    created.uploaded_by_id,
    fileMeta.uploaded_by_id,
  );
  TestValidator.equals(
    "uploaded_at matches input",
    created.uploaded_at,
    fileMeta.uploaded_at,
  );
  TestValidator.predicate(
    "created record has unique id",
    typeof created.id === "string" && !!created.id,
  );
  TestValidator.predicate(
    "created record has proper uploaded_at timestamp",
    typeof created.uploaded_at === "string" && !!created.uploaded_at,
  );

  // 3. Attempt duplicate storage_uri (should error)
  await TestValidator.error(
    "duplicate storage_uri triggers unique constraint error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.create(
        connection,
        {
          body: {
            ...fileMeta,
            original_filename: `${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 })}.png`,
          },
        },
      );
    },
  );

  // 4. Attempt file creation with empty original_filename (should error)
  await TestValidator.error(
    "empty original_filename triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.create(
        connection,
        {
          body: {
            ...fileMeta,
            original_filename: "",
          },
        },
      );
    },
  );

  // 5. Attempt file creation with invalid field type (size_bytes as negative number) (should error)
  await TestValidator.error(
    "negative size_bytes triggers validation error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.create(
        connection,
        {
          body: {
            ...fileMeta,
            size_bytes: -500,
          },
        },
      );
    },
  );
}
