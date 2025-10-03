import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallEntitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEntitySnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";
import type { IShoppingMallEntitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntitySnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validates admin audit entity snapshot search and pagination.
 *
 * - 1. Register an admin and authenticate
 * - 2. Register an attachment for linkage
 * - 3. Register a product as the entity
 * - 4. Create an entity-attachment link (which triggers audit snapshot)
 * - 5. Search entitySnapshots with filters (entity_type, entity_id, actor,
 *        page/limit)
 * - 6. Assert new snapshot found and data matches entity_id/type, actor, etc.
 * - 7. Assert pagination info
 * - 8. Search with invalid filter to check empty result
 */
export async function test_api_entity_snapshot_history_admin_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin registration and authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "A1bc2de3", // simple strong password for test
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // (The connection/session is now authenticated as admin)

  // 2. Create an attachment
  const attachmentBody = {
    filename: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    file_extension: "txt",
    mime_type: "text/plain",
    size_bytes: 512,
    server_url: "https://cdn.example.com/file/test.txt",
    public_accessible: true,
    permission_scope: "admin_only",
    logical_source: "test_audit_attachment",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment: IShoppingMallAttachment =
    await api.functional.shoppingMall.admin.attachments.create(connection, {
      body: attachmentBody,
    });
  typia.assert(attachment);

  // 3. Register a product as entity (dummy owner/channel/section/category uuids)
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 4. Entity-Attachment link: triggers an audit snapshot
  const entityAttachmentLinkBody = {
    shopping_mall_attachment_id: attachment.id,
    entity_type: "product",
    entity_id: product.id,
    linked_by_user_id: adminAuth.id,
    purpose: "evidence",
    visible_to_roles: "admin",
  } satisfies IShoppingMallEntityAttachmentLink.ICreate;
  const entityAttachmentLink: IShoppingMallEntityAttachmentLink =
    await api.functional.shoppingMall.admin.entityAttachmentLinks.create(
      connection,
      { body: entityAttachmentLinkBody },
    );
  typia.assert(entityAttachmentLink);

  // 5. Search for snapshots with valid filters
  const page = 1 satisfies number;
  const limit = 10 satisfies number;
  const entitySnapshotQueryValid = {
    entity_type: "product",
    entity_id: product.id,
    snapshot_actor_id: adminAuth.id,
    page,
    limit,
  } satisfies IShoppingMallEntitySnapshot.IRequest;
  const pageResult: IPageIShoppingMallEntitySnapshot =
    await api.functional.shoppingMall.admin.entitySnapshots.index(connection, {
      body: entitySnapshotQueryValid,
    });
  typia.assert(pageResult);
  // 6. Assert at least one snapshot is found and matches entity_id/type & actor
  TestValidator.predicate(
    "snapshot page includes created entity_id and actor",
    pageResult.data.some(
      (snap) =>
        snap.entity_id === product.id &&
        snap.entity_type === "product" &&
        snap.snapshot_actor_id === adminAuth.id,
    ),
  );
  // 7. Assert page info present and correct
  TestValidator.equals(
    "pagination page matches",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches",
    pageResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "at least one snapshot in page",
    pageResult.data.length > 0,
  );

  // 8. Search with invalid filter (wrong entity_type)
  const entitySnapshotQueryInvalid = {
    entity_type: "nonexistent_type",
    entity_id: product.id,
    page,
    limit,
  } satisfies IShoppingMallEntitySnapshot.IRequest;
  const emptyPageResult: IPageIShoppingMallEntitySnapshot =
    await api.functional.shoppingMall.admin.entitySnapshots.index(connection, {
      body: entitySnapshotQueryInvalid,
    });
  typia.assert(emptyPageResult);
  TestValidator.equals(
    "entity_type filter prevents matches",
    emptyPageResult.data.length,
    0,
  );
}
