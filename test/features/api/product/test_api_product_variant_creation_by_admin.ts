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

/**
 * Validates the complete workflow for an admin user to create a product variant
 * (SKU) for an existing product.
 *
 * This test checks the sequential admin-only process to:
 *
 * 1. Register and authenticate as an admin.
 * 2. Create a new channel.
 * 3. Create a section within that channel.
 * 4. Create a category within the channel.
 * 5. Register a new product under the new channel, section, and category; the
 *    admin is the seller.
 * 6. Create a product variant (SKU) providing unique sku_code, option_values_hash,
 *    price, stock_quantity, and weight.
 * 7. Assert variant properties and referential correctness.
 * 8. Attempt to create a variant with a duplicate sku_code and/or
 *    option_values_hash for the same product, verify error.
 * 9. Attempt to create a variant as an unauthenticated user, verify authorization
 *    is enforced.
 *
 * Test asserts correctness for all created entities, checks uniqueness rules,
 * verifies variant's parent product linkage, and confirms system audit fields
 * are set. Also asserts correct handling of authorization failures and
 * duplicate constraint violations.
 */
export async function test_api_product_variant_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminName: string = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword,
    name: adminName,
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);
  // Token is now in connection automatically

  // 2. Create channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(12),
    name:
      "Channel " +
      RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 3. Create section in channel
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(10),
    name: "Section " + RandomGenerator.name(1),
    display_order: 1,
    description: "Section for variant test.",
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);

  // 4. Create category in channel
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: "Category " + RandomGenerator.name(1),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallChannelCategory.ICreate;
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: categoryInput,
      },
    );
  typia.assert(category);

  // 5. Create product (admin is seller)
  const productInput = {
    shopping_mall_seller_id: admin.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);
  TestValidator.equals(
    "product status matches",
    product.status,
    productInput.status,
  );
  TestValidator.equals(
    "product business_status matches",
    product.business_status,
    productInput.business_status,
  );

  // 6. Create product variant (SKU)
  const skuCode = "SKU-" + RandomGenerator.alphaNumeric(10);
  const optionHash = RandomGenerator.alphaNumeric(16);
  const variantInput = {
    shopping_mall_product_id: product.id,
    sku_code: skuCode,
    option_values_hash: optionHash,
    bar_code: null,
    price: 10000,
    stock_quantity: 50,
    weight: 2.5,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await api.functional.shoppingMall.admin.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variantInput,
      },
    );
  typia.assert(variant);
  TestValidator.equals("variant sku_code matches", variant.sku_code, skuCode);
  TestValidator.equals(
    "variant option_values_hash matches",
    variant.option_values_hash,
    optionHash,
  );
  TestValidator.equals(
    "variant parent linkage",
    variant.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "variant price matches",
    variant.price,
    variantInput.price,
  );
  TestValidator.equals("created_at set", typeof variant.created_at, "string");
  TestValidator.equals("updated_at set", typeof variant.updated_at, "string");
  TestValidator.equals(
    "bar_code is null/undef",
    variant.bar_code ?? null,
    null,
  );

  // 7. Attempt to create variant with same sku_code and option_values_hash (should fail for uniqueness)
  await TestValidator.error(
    "duplicate sku_code/option_values_hash should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.create(
        connection,
        {
          productId: product.id,
          body: {
            ...variantInput,
          },
        },
      );
    },
  );

  // 8. Attempt creation with new sku_code but same option_values_hash (still should fail uniqueness on option hash)
  const variantInputConflicting = {
    ...variantInput,
    sku_code: "SKU-" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallProductVariant.ICreate;
  await TestValidator.error(
    "conflicting option_values_hash should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.create(
        connection,
        {
          productId: product.id,
          body: variantInputConflicting,
        },
      );
    },
  );

  // 9. Validate authorization: try variant creation as unauthenticated user
  // For unauthenticated, create a connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized variant creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.variants.create(
        unauthConn,
        {
          productId: product.id,
          body: {
            shopping_mall_product_id: product.id,
            sku_code: "SKU-" + RandomGenerator.alphaNumeric(10),
            option_values_hash: RandomGenerator.alphaNumeric(16),
            bar_code: null,
            price: 9999,
            stock_quantity: 10,
            weight: 1.0,
          },
        },
      );
    },
  );
}
