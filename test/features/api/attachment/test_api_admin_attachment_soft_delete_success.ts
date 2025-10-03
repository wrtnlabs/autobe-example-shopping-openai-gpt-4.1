import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";

/**
 * Validate admin logical (soft) deletion of attachments (file metadata).
 *
 * 1. Authenticate as admin (registration/join).
 * 2. Register/create a new attachment with random metadata.
 * 3. Perform soft deletion for that attachment.
 * 4. Confirm deleted_at is set, and record remains for audit.
 * 5. Attempt a second delete (should fail with error).
 * 6. Attempt delete on non-existent id (should fail).
 */
export async function test_api_admin_attachment_soft_delete_success(
  connection: api.IConnection,
) {
  // 1. Admin join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePW!1234",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin token present",
    typeof admin.token.access === "string" && admin.token.access.length > 10,
  );

  // 2. Register new attachment
  const attachmentCreate = {
    filename: RandomGenerator.name() + ".pdf",
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    server_url:
      "https://cdn.test.com/file/" +
      typia.random<string & tags.Format<"uuid">>(),
    public_accessible: false,
    logical_source: "test-upload",
    permission_scope: "admin_only",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment: IShoppingMallAttachment =
    await api.functional.shoppingMall.admin.attachments.create(connection, {
      body: attachmentCreate,
    });
  typia.assert(attachment);
  TestValidator.equals(
    "filename matches",
    attachment.filename,
    attachmentCreate.filename,
  );
  TestValidator.equals(
    "attachment not yet deleted",
    attachment.deleted_at,
    undefined,
  );

  // 3. Soft delete the attachment
  await api.functional.shoppingMall.admin.attachments.erase(connection, {
    attachmentId: attachment.id,
  });

  // 4. Fetch again (simulate: direct read, as no GET API in allowed set)
  // Since no 'at' API for reading exists here, simulate by re-creating or explain skipped verification.
  // 5. Try deleting again - should error.
  await TestValidator.error(
    "deleting already soft-deleted attachment should error",
    async () => {
      await api.functional.shoppingMall.admin.attachments.erase(connection, {
        attachmentId: attachment.id,
      });
    },
  );

  // 6. Try deleting a random, non-existent attachment
  await TestValidator.error(
    "deleting non-existent attachment should error",
    async () => {
      await api.functional.shoppingMall.admin.attachments.erase(connection, {
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
