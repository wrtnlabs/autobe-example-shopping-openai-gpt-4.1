import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";

export async function test_api_admin_file_deletion_success(
  connection: api.IConnection,
) {
  /**
   * Verify successful (soft) deletion of an admin file by ID.
   *
   * This test ensures:
   *
   * - Admin can register and authenticate via API
   * - File metadata can be created by admin (receive valid fileId)
   * - DELETE operation on /shoppingMallAiBackend/admin/files/{fileId} completes
   *   with void response
   * - File is marked as soft-deleted (deleted_at) – cannot be rechecked without a
   *   read/search API, so this test covers logical deletion action.
   *
   * Steps:
   *
   * 1. Register a new admin, asserting username and email match input
   * 2. Create file metadata as admin, asserting uploader id matches admin id and
   *    deleted_at is null
   * 3. Perform file deletion (soft delete) by id and assert void response
   */

  // 1. Register admin
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphabets(8)}@e2e-admin.test`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "admin account in response has correct username",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin account in response has correct email",
    adminJoin.admin.email,
    adminEmail,
  );

  // 2. Create file metadata as admin
  const now = new Date();
  const fileMeta =
    await api.functional.shoppingMallAiBackend.admin.files.create(connection, {
      body: {
        original_filename: `${RandomGenerator.alphaNumeric(10)}.e2e`,
        mime_type: RandomGenerator.pick([
          "application/octet-stream",
          "image/png",
          "application/pdf",
        ] as const),
        storage_uri: `e2e://e2e-admin/${RandomGenerator.alphaNumeric(16)}`,
        size_bytes: 23456,
        uploaded_by_id: adminJoin.admin.id,
        uploaded_at: now.toISOString() as string & tags.Format<"date-time">,
      } satisfies IShoppingMallAiBackendFile.ICreate,
    });
  typia.assert(fileMeta);
  TestValidator.equals(
    "file uploader id matches admin id",
    fileMeta.uploaded_by_id,
    adminJoin.admin.id,
  );
  TestValidator.equals(
    "file is not soft-deleted before deletion",
    fileMeta.deleted_at,
    null,
  );

  // 3. Perform soft-delete on file by id
  await api.functional.shoppingMallAiBackend.admin.files.erase(connection, {
    fileId: fileMeta.id,
  });

  // Note: No file read or listing endpoint is available to confirm post-delete exclusion or deleted_at set.
}
