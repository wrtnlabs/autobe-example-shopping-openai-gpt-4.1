import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";

/**
 * Test that an admin can update attachment metadata (filename, MIME type,
 * permission scope, description) using the admin endpoint.
 *
 * Steps:
 *
 * 1. Register/join as an admin.
 * 2. Create a new attachment as the admin (random valid data).
 * 3. Prepare a metadata update payload that only modifies filename, mime_type,
 *    permission_scope, and description.
 * 4. Call the PUT /shoppingMall/admin/attachments/{attachmentId} endpoint.
 * 5. Assert that these fields in the response reflect the update.
 * 6. Assert that non-modifiable fields are unchanged.
 * 7. Check soft-deletion has not occurred and that file content (server_url, hash,
 *    etc) is untouched.
 * 8. Updated_at timestamp should advance.
 * 9. Updated attachment data passes full type validation.
 */
export async function test_api_admin_attachment_metadata_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!Admin",
        name: adminName,
      },
    });
  typia.assert(admin);

  // 2. Create a new attachment with random valid data
  const createBody = {
    filename: RandomGenerator.paragraph({ sentences: 2 }),
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    server_url:
      "https://files.example.com/" + RandomGenerator.alphaNumeric(16) + ".pdf",
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "order-receipt",
    description: "initial upload",
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment: IShoppingMallAttachment =
    await api.functional.shoppingMall.admin.attachments.create(connection, {
      body: createBody,
    });
  typia.assert(attachment);

  // Capture original fields for immutability verification
  const originalFields = { ...attachment };

  // 3. Prepare an update body: change only modifiable fields
  const updatedFields = {
    filename: RandomGenerator.paragraph({ sentences: 3 }),
    mime_type: "application/zip",
    permission_scope: "public",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallAttachment.IUpdate;
  const updateInput = { ...updatedFields };

  // 4. Update the attachment metadata
  const updated: IShoppingMallAttachment =
    await api.functional.shoppingMall.admin.attachments.update(connection, {
      attachmentId: attachment.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 5. Assert only allowed fields changed, rest are unchanged
  TestValidator.equals(
    "filename was updated",
    updated.filename,
    updatedFields.filename,
  );
  TestValidator.equals(
    "mime_type was updated",
    updated.mime_type,
    updatedFields.mime_type,
  );
  TestValidator.equals(
    "permission_scope was updated",
    updated.permission_scope,
    updatedFields.permission_scope,
  );
  TestValidator.equals(
    "description was updated",
    updated.description,
    updatedFields.description,
  );

  // 6. Non-updatable fields must be unchanged
  TestValidator.equals(
    "file_extension did not change",
    updated.file_extension,
    attachment.file_extension,
  );
  TestValidator.equals(
    "hash_md5 did not change",
    updated.hash_md5,
    attachment.hash_md5,
  );
  TestValidator.equals(
    "server_url did not change",
    updated.server_url,
    attachment.server_url,
  );
  TestValidator.equals(
    "size_bytes did not change",
    updated.size_bytes,
    attachment.size_bytes,
  );
  TestValidator.equals(
    "public_accessible did not change",
    updated.public_accessible,
    attachment.public_accessible,
  );
  TestValidator.equals(
    "logical_source did not change",
    updated.logical_source,
    attachment.logical_source,
  );
  TestValidator.equals("id did not change", updated.id, attachment.id);
  TestValidator.equals(
    "created_at did not change",
    updated.created_at,
    attachment.created_at,
  );
  TestValidator.equals(
    "deleted_at did not change",
    updated.deleted_at,
    attachment.deleted_at,
  );

  // 7. Check updated_at advanced
  TestValidator.predicate(
    "updated_at timestamp was updated",
    new Date(updated.updated_at).getTime() >
      new Date(attachment.updated_at).getTime(),
  );
}
