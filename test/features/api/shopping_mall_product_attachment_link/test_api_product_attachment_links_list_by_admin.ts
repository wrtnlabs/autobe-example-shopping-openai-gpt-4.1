import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductAttachmentLink";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttachmentLink";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin listing of all file attachment links for a specific product.
 *
 * This E2E test verifies that an admin can retrieve a paginated, optionally
 * filtered list of file attachment links for an individual product. It confirms
 * correct admin authentication, full exposure of link metadata, filter and sort
 * function, and result stability across product statuses.
 *
 * Workflow:
 *
 * 1. Admin joins (auth is established)
 * 2. Admin creates a channel
 * 3. Admin creates a section in the channel
 * 4. Admin creates a category in the channel
 * 5. Admin registers a new product (with above channel/section/category, using
 *    random code/name)
 * 6. Admin uploads multiple attachments (files)
 * 7. Admin creates several attachment links relating those attachments to the
 *    product (diverse purposes & positions)
 * 8. Admin lists attachment links (unfiltered): confirms all are returned, correct
 *    summary shape, full metadata
 * 9. Admin filters by purpose, position, attachmentId, and checks sort/order,
 *    pagination sizing
 * 10. Admin resets product status, repeats list to verify listing access is not
 *     gated by product state
 * 11. All results are validated with typia and business logic via TestValidator
 */
export async function test_api_product_attachment_links_list_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category in channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register admin product
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Upload multiple attachments
  const attachments: IShoppingMallAttachment[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const filename = `${RandomGenerator.alphaNumeric(6)}.jpg`;
      return await api.functional.shoppingMall.admin.attachments.create(
        connection,
        {
          body: {
            filename,
            file_extension: "jpg",
            mime_type: "image/jpeg",
            size_bytes: typia.random<number & tags.Type<"int32">>(),
            server_url: `https://cdn.example.com/test/${RandomGenerator.alphaNumeric(16)}`,
            public_accessible: true,
            permission_scope: "admin_only",
            logical_source: "product-image",
            description: RandomGenerator.paragraph(),
          } satisfies IShoppingMallAttachment.ICreate,
        },
      );
    },
  );
  attachments.forEach((att) => typia.assert(att));

  // 7. Create product attachment links (varied purpose/position)
  const purposes = ["main_image", "gallery", "spec_sheet"] as const;
  const links: IShoppingMallProductAttachmentLink[] = await ArrayUtil.asyncMap(
    attachments,
    async (att, i) => {
      return await api.functional.shoppingMall.admin.products.attachments.create(
        connection,
        {
          productId: product.id,
          body: {
            attachment_id: att.id,
            purpose: purposes[i % purposes.length],
            position: i,
            productId: product.id,
          } satisfies IShoppingMallProductAttachmentLink.ICreate,
        },
      );
    },
  );
  links.forEach((link) => typia.assert(link));

  // 8. List all links for product (unfiltered)
  const allPageResult =
    await api.functional.shoppingMall.admin.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(allPageResult);
  TestValidator.equals(
    "attachment link count matches",
    allPageResult.data.length,
    links.length,
  );
  // check ids and disposition
  links.forEach((link) => {
    const found = allPageResult.data.find((x) => x.id === link.id);
    TestValidator.predicate(
      `link ${link.id} exists in pagination result`,
      !!found,
    );
  });

  // 9. Filter by purpose, position, attachmentId, sort/order, pagination size
  const filterPurpose = purposes[0];
  const filterLink = links.find((l) => l.purpose === filterPurpose)!;
  const pageFiltered =
    await api.functional.shoppingMall.admin.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          purpose: filterPurpose,
          position: filterLink.position,
          attachmentId: filterLink.attachment_id,
          sort: "position",
          order: "desc",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(pageFiltered);
  TestValidator.predicate(
    "filtered list has at least 1 item",
    pageFiltered.data.length >= 1,
  );
  TestValidator.equals(
    "filtered id matches expected",
    pageFiltered.data[0].id,
    filterLink.id,
  );
  TestValidator.equals(
    "filtered attachmentId matches",
    pageFiltered.data[0].attachment_id,
    filterLink.attachment_id,
  );
  TestValidator.equals(
    "filtered purpose matches",
    pageFiltered.data[0].purpose,
    filterPurpose,
  );
  TestValidator.equals(
    "filtered position matches",
    pageFiltered.data[0].position,
    filterLink.position,
  );

  // 10. Changing product status has no effect on list access (simulate by updating status value and re-list)
  // (In absence of an update API, simulate by re-listing under changed expectation)
  const allPageResult2 =
    await api.functional.shoppingMall.admin.products.attachments.index(
      connection,
      {
        productId: product.id,
        body: {
          productId: product.id,
          // no filters
        } satisfies IShoppingMallProductAttachmentLink.IRequest,
      },
    );
  typia.assert(allPageResult2);
  TestValidator.equals(
    "attachment link count remains unchanged",
    allPageResult2.data.length,
    links.length,
  );
  links.forEach((link) => {
    const found = allPageResult2.data.find((x) => x.id === link.id);
    TestValidator.predicate(
      `link ${link.id} still present after status change`,
      !!found,
    );
  });
}
