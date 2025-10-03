import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate creation of a product variant (SKU) as a new seller with all
 * required dependencies satisfied.
 *
 * Test scenario covers:
 *
 * 1. Admin registration and authentication
 * 2. Channel creation (admin)
 * 3. Section creation (admin)
 * 4. Category creation (admin)
 * 5. Seller registration (in proper channel/section)
 * 6. Product creation by seller
 * 7. Product variant (SKU) creation by seller
 *
 * Business rules validated:
 *
 * - SKU code must be unique per product
 * - Option_values_hash must appear unique and deterministic
 * - Price and stock_quantity must be valid positive values
 * - Variant cannot be created with parent product deleted/paused (not tested
 *   here, but flows protected)
 * - Success and duplicate SKU check; unowned product variant create failure
 */
export async function test_api_product_variant_creation_by_seller_with_required_dependencies(
  connection: api.IConnection,
) {
  // 1. Admin sign up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPass1234$",
        name: RandomGenerator.name(),
      },
    });
  typia.assert(adminAuth);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 3. Create section in channel
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

  // 4. Create category in channel
  const categoryBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
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

  // 5. Seller sign up (joins the created channel & section)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBody = {
    email: sellerEmail,
    password: "sellerPassword1!",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(sellerAuth);

  // 6. Seller registers a product (under their allowed channel/section/category)
  const productBody = {
    shopping_mall_seller_id: sellerAuth.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(13),
    name: RandomGenerator.name(),
    status: "Active", // string, example business status, but no enum, so use realistic status
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 7. Seller creates product variant (SKU)
  const skuCode = RandomGenerator.alphaNumeric(10);
  const optionHash = RandomGenerator.alphaNumeric(32);
  const price = 19900;
  const stockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const weight = 0.7;
  const variantBody = {
    shopping_mall_product_id: product.id,
    sku_code: skuCode,
    bar_code: null,
    option_values_hash: optionHash,
    price,
    stock_quantity: stockQuantity,
    weight,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variantBody,
      },
    );
  typia.assert(variant);
  TestValidator.equals("SKU code must match input", variant.sku_code, skuCode);
  TestValidator.equals(
    "Variant must belong to product",
    variant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "option_values_hash must match input",
    variant.option_values_hash,
    optionHash,
  );
  TestValidator.equals("Price must match input", variant.price, price);
  TestValidator.equals(
    "Stock quantity must match input",
    variant.stock_quantity,
    stockQuantity,
  );
  TestValidator.equals("Weight must match input", variant.weight, weight);

  // 8. Attempt to create duplicate SKU for same product
  await TestValidator.error(
    "duplicate SKU code for same product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productId: product.id,
          body: {
            ...variantBody,
            sku_code: skuCode, // exact same SKU code triggers business error
            option_values_hash: RandomGenerator.alphaNumeric(32),
          },
        },
      );
    },
  );
  // 9. Attempt to create variant for unowned product (simulate by using random product ID)
  await TestValidator.error(
    "non-owned product variant creation should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.create(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: variantBody,
        },
      );
    },
  );
}
