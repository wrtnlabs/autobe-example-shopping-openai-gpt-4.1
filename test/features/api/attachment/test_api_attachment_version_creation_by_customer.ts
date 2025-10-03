import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate attachment version creation by a customer, enforcing version history
 * and access/audit compliance.
 *
 * 1. Register a new customer (join with unique channel/email)
 * 2. Customer uploads an initial attachment
 * 3. Customer uploads a new version for that attachment
 * 4. Validate version chain and audit fields (created_at, version_number,
 *    uploader_id)
 * 5. Attempt forbidden actions: upload new version after soft-deleting the
 *    attachment (should error)
 */
export async function test_api_attachment_version_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Customer uploads an initial attachment
  const attachmentBody = {
    filename: RandomGenerator.alphaNumeric(10) + ".pdf",
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: 1024,
    server_url: `https://files.example.com/${RandomGenerator.alphaNumeric(24)}.pdf`,
    public_accessible: false,
    permission_scope: "customer",
    logical_source: "review",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment =
    await api.functional.shoppingMall.customer.attachments.create(connection, {
      body: attachmentBody,
    });
  typia.assert(attachment);

  // 3. Customer uploads a new version for this attachment
  const versionBody = {
    server_url: `https://files.example.com/${RandomGenerator.alphaNumeric(32)}.pdf`,
    filename: RandomGenerator.alphaNumeric(10) + "_v2.pdf",
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: 2048,
    hash_md5: RandomGenerator.alphaNumeric(32),
    uploader_id: customer.id,
  } satisfies IShoppingMallAttachmentVersion.ICreate;
  const version =
    await api.functional.shoppingMall.customer.attachments.versions.create(
      connection,
      {
        attachmentId: attachment.id,
        body: versionBody,
      },
    );
  typia.assert(version);

  // 4. Validate version chain and important metadata
  TestValidator.equals(
    "attachment id matches on version",
    version.shopping_mall_attachment_id,
    attachment.id,
  );
  TestValidator.equals("version number is 2", version.version_number, 2);
  TestValidator.equals(
    "uploader id is customer",
    version.uploader_id,
    customer.id,
  );
  TestValidator.equals(
    "filename matches input",
    version.filename,
    versionBody.filename,
  );
  TestValidator.equals(
    "file extension matches",
    version.file_extension,
    versionBody.file_extension,
  );
  TestValidator.equals(
    "size_bytes updated",
    version.size_bytes,
    versionBody.size_bytes,
  );
  TestValidator.equals(
    "hash_md5 matches",
    version.hash_md5,
    versionBody.hash_md5,
  );
  TestValidator.predicate(
    "created_at is recent",
    new Date(version.created_at).getTime() > Date.now() - 1000 * 60 * 5,
  );

  // 5. Soft-delete is simulated by attempting to upload to a (logically) deleted attachment id
  // As we can't really delete without admin API, simulate by generating a random UUID (non-existent)
  await TestValidator.error(
    "cannot upload version to non-existent attachment",
    async () => {
      await api.functional.shoppingMall.customer.attachments.versions.create(
        connection,
        {
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
          body: versionBody,
        },
      );
    },
  );
}
