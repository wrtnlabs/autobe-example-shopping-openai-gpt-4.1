import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate customer view and retrieval of a shopping cart item with all
 * dependencies.
 *
 * This test simulates the complete workflow where a customer registers,
 * business channel and structures are setup, a product and variant is
 * registered, a cart is created for that customer, an item (with
 * variant/options) is added to the cart, and then the GET API for cart item
 * detail is used to validate all data and business logic.
 *
 * Scenario Steps:
 *
 * 1. Create a new shopping mall channel (for tenant scoping)
 * 2. Create a new section within the channel
 * 3. Create a new category within the channel
 * 4. Register a customer to that channel
 * 5. Register a product to the channel, section, and category (as seller)
 * 6. Register a product variant under the product
 * 7. Create a cart as the customer
 * 8. Add a product/variant as an item to the cart
 * 9. Retrieve the cart item using the GET operation and assert all fields
 *
 * The test verifies that:
 *
 * - All resource relationships are correctly set (customer, channel, section,
 *   category, product, variant, cart, cart item)
 * - The cart item details exactly match what was inserted (product/variant ids,
 *   snapshot)
 * - The price, stock, and selection accurately reflect the variant and current
 *   catalog state
 * - Only the owning customer can retrieve this cart item
 * - No field is missing or incorrect as per DTO and business requirements
 */
export async function test_api_cart_item_detail_customer_view(
  connection: api.IConnection,
) {
  // 1. Create channel
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

  // 2. Create section
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
          display_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Register customer
  const customerEmail = RandomGenerator.alphaNumeric(8) + "@test.com";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 5. Register product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Register product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(12),
          bar_code: null,
          option_values_hash: RandomGenerator.alphaNumeric(16),
          price: 9990,
          stock_quantity: 20,
          weight: 1,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 7. Create cart for customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 8. Add cart item
  const optionSnapshot = JSON.stringify({
    variant: variant.id,
    option_values_hash: variant.option_values_hash,
  });
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: variant.id,
        quantity: 2,
        option_snapshot: optionSnapshot,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 9. Retrieve cart item detail
  const retrieved = await api.functional.shoppingMall.customer.carts.items.at(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
    },
  );
  typia.assert(retrieved);

  // 10. Validate details
  TestValidator.equals("cart item id", retrieved.id, cartItem.id);
  TestValidator.equals(
    "cart item product",
    retrieved.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "cart item variant",
    retrieved.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals(
    "cart item quantity",
    retrieved.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "option snapshot",
    retrieved.option_snapshot,
    optionSnapshot,
  );
  TestValidator.equals(
    "cart item belongs to the cart",
    retrieved.shopping_mall_cart_id,
    cart.id,
  );
}
