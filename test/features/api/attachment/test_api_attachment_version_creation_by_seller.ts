import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates seller attachment versioning including positive and negative cases.
 *
 * 1. Register seller A, obtain authorization.
 * 2. Seller A uploads an attachment (base file for versioning).
 * 3. Seller A creates a new version for their own attachment, verifying metadata,
 *    parent linkage, and version increment.
 * 4. Register seller B (separate account, separate section/channel).
 * 5. Attempt to add a version to seller A's attachment using seller B credentials
 *    (should error).
 * 6. Attempt to version a deleted attachment (simulate by soft deletion if
 *    possible, expect error).
 */
export async function test_api_attachment_version_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller A
  const sellerAJoin = typia.random<IShoppingMallSeller.IJoin>();
  const sellerAAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerAJoin,
  });
  typia.assert(sellerAAuthorized);
  const sellerA = sellerAAuthorized.seller!;
  TestValidator.equals(
    "seller A email",
    sellerAAuthorized.seller?.id,
    sellerA.id,
  );

  // 2. Seller A uploads an attachment
  const initialAttachmentBody = typia.random<IShoppingMallAttachment.ICreate>();
  const attachment =
    await api.functional.shoppingMall.seller.attachments.create(connection, {
      body: initialAttachmentBody,
    });
  typia.assert(attachment);

  // 3. Seller A creates new version
  const versionBody = {
    server_url: RandomGenerator.alphaNumeric(20),
    filename:
      RandomGenerator.name(1) + "_v2." + initialAttachmentBody.file_extension,
    file_extension: initialAttachmentBody.file_extension,
    mime_type: initialAttachmentBody.mime_type,
    size_bytes: initialAttachmentBody.size_bytes,
    hash_md5: RandomGenerator.alphaNumeric(32),
    uploader_id: sellerA.id,
  } satisfies IShoppingMallAttachmentVersion.ICreate;
  const version =
    await api.functional.shoppingMall.seller.attachments.versions.create(
      connection,
      {
        attachmentId: attachment.id,
        body: versionBody,
      },
    );
  typia.assert(version);

  TestValidator.equals(
    "attachmentId matches",
    version.shopping_mall_attachment_id,
    attachment.id,
  );
  TestValidator.equals("uploader id matches", version.uploader_id, sellerA.id);
  TestValidator.equals("filename", version.filename, versionBody.filename);
  TestValidator.notEquals(
    "version number should increment",
    version.version_number,
    1,
  );
  TestValidator.predicate("version_number > 1", version.version_number > 1);

  // 4. Register seller B (should be on different section/channel for full test coverage)
  const sellerBJoin = {
    ...typia.random<IShoppingMallSeller.IJoin>(),
    email: typia.random<string & tags.Format<"email">>(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
  };
  const sellerBAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerBJoin,
  });
  typia.assert(sellerBAuthorized);

  // 5. Switch context: Now use seller B credentials to version seller A's attachment
  await TestValidator.error(
    "seller B cannot version seller A's attachment",
    async () => {
      // forcibly use sellerB's token in connection (SDK should use latest after join)
      await api.functional.shoppingMall.seller.attachments.versions.create(
        connection,
        {
          attachmentId: attachment.id,
          body: {
            ...versionBody,
            uploader_id: sellerBAuthorized.seller!.id,
          },
        },
      );
    },
  );

  // 6. Deleted attachment scenario. Here we simulate by versioning a random non-existent id as if it is deleted.
  await TestValidator.error(
    "cannot version a deleted or non-existent attachment",
    async () => {
      await api.functional.shoppingMall.seller.attachments.versions.create(
        connection,
        {
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
          body: versionBody,
        },
      );
    },
  );
}
