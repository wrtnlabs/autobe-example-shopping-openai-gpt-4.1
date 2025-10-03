import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate the admin product variant list and search API (PATCH
 * /shoppingMall/admin/products/{productId}/variants).
 *
 * This test verifies the full admin-side workflow for listing product variants,
 * beginning with provisioning all parent entities.
 *
 * Steps:
 *
 * 1. Register a new admin with unique credentials.
 * 2. Create a new channel.
 * 3. Create a section within the channel.
 * 4. Create a category under the channel.
 * 5. Create a new product tied to the channel, section, and category.
 * 6. Register two unique product variants under that product (to exercise
 *    pagination and filtering).
 * 7. Call the variant listing endpoint (PATCH
 *    /shoppingMall/admin/products/{productId}/variants) with filter and
 *    pagination.
 * 8. Validate response shape, pagination metadata, and correct inclusion of the
 *    variants just created.
 * 9. Test filter logic: search by SKU code, price, and paginate over the results.
 * 10. Validate business rule for authorization: repeat step 7 with an
 *     unauthenticated connection and assert error is thrown.
 */
export async function test_api_product_variant_list_admin_with_auth_and_dependency_setup(
  connection: api.IConnection,
) {
  // 1. Register a new admin (and switch connection to authenticated state)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create a new channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Create a section within the channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // 4. Create a category under the channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 5. Create a new product
  const productBody = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // Admin can set any value
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    status: RandomGenerator.pick([
      "Draft",
      "Active",
      "Paused",
      "Discontinued",
      "Deleted",
    ] as const),
    business_status: RandomGenerator.pick([
      "Approval",
      "Pending Activation",
      "Blocked",
      "Suspended",
    ] as const),
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 6. Create two product variants to exercise search/pagination
  const variant1Body = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
    bar_code: RandomGenerator.alphaNumeric(13),
    option_values_hash: RandomGenerator.alphaNumeric(32),
    price: 12345,
    stock_quantity: 100,
    weight: 2.5,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant1 =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variant1Body,
      },
    );
  typia.assert(variant1);

  const variant2Body = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
    bar_code: RandomGenerator.alphaNumeric(13),
    option_values_hash: RandomGenerator.alphaNumeric(32),
    price: 54321,
    stock_quantity: 10,
    weight: 1.25,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant2 =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variant2Body,
      },
    );
  typia.assert(variant2);

  // 7. List variants via PATCH (no filters - get all)
  const pageAll =
    await api.functional.shoppingMall.admin.products.variants.index(
      connection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "variant list includes both variants",
    pageAll.data.some((v) => v.id === variant1.id) &&
      pageAll.data.some((v) => v.id === variant2.id),
  );
  TestValidator.equals(
    "pagination records equals total variants",
    pageAll.pagination.records,
    pageAll.data.length,
  );

  // 8. List variants with pagination (limit 1, page 1)
  const paginated =
    await api.functional.shoppingMall.admin.products.variants.index(
      connection,
      {
        productId: product.id,
        body: { limit: 1, page: 1 },
      },
    );
  typia.assert(paginated);
  TestValidator.equals("paginated limit is 1", paginated.pagination.limit, 1);
  TestValidator.predicate(
    "paginated variant exists in created variants",
    paginated.data.some((v) => [variant1.id, variant2.id].includes(v.id)),
  );

  // 9. List variants with SKU code filter (should match variant1 or variant2)
  const skuPage =
    await api.functional.shoppingMall.admin.products.variants.index(
      connection,
      {
        productId: product.id,
        body: { sku_code: variant1.sku_code },
      },
    );
  typia.assert(skuPage);
  TestValidator.equals(
    "only one variant with specific sku_code",
    skuPage.data.length,
    1,
  );
  TestValidator.equals(
    "sku_code matches filter",
    skuPage.data[0].sku_code,
    variant1.sku_code,
  );

  // 10. Authorization: try to list variants with unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should error for unauthenticated variant list request",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.index(
        unauthConnection,
        {
          productId: product.id,
          body: {},
        },
      );
    },
  );
}
