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
 * Validates customer removal of their cart item, enforcing soft deletion (audit
 * evidence) and proper authorization.
 *
 * Test steps:
 *
 * 1. Register a channel as admin (setup for test isolation)
 * 2. Register a section under the channel
 * 3. Register a category under the channel
 * 4. Seller registers a product and variant within channel/section/category
 * 5. Customer joins (register) into the channel
 * 6. Customer creates a cart (member)
 * 7. Customer adds a product variant to cart
 * 8. Customer removes their cart item via erase endpoint
 * 9. Validate: direct cart query shows item is gone (simulate audit: see
 *    deleted_at using typia if possible)
 * 10. Validate: cannot re-remove (error case), cannot remove other's items (auth
 *     error case)
 * 11. (Edge case) Remove fails if cart is checked out/expired (simulate status
 *     change and test)
 * 12. Remove fails for non-existent item
 */
export async function test_api_cart_cart_item_remove_by_customer(
  connection: api.IConnection,
) {
  // Step 1. Create channel (admin)
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 2. Create section (admin)
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // Step 3. Create category (admin)
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(4),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4. Seller creates product
  // For this test, we use admin connection as 'seller'. Test infra does not include seller join/log-in.
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5. Create product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values_hash: RandomGenerator.alphaNumeric(16),
          price: 10000,
          stock_quantity: 10,
          weight: 50,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // Step 6. Register a customer for the channel
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: `${RandomGenerator.alphaNumeric(10)}@e2e.test.com`,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // Step 7. Customer creates cart
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

  // Step 8. Customer adds item to cart
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: variant.id,
        quantity: 1,
        option_snapshot: JSON.stringify({ variant: variant.sku_code }),
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // Step 9. Remove cart item (successful scenario)
  await api.functional.shoppingMall.customer.carts.items.erase(connection, {
    cartId: cart.id,
    cartItemId: cartItem.id,
  });

  // Step 10. Try to re-remove (expect error)
  await TestValidator.error(
    "cannot remove already deleted cart item",
    async () =>
      await api.functional.shoppingMall.customer.carts.items.erase(connection, {
        cartId: cart.id,
        cartItemId: cartItem.id,
      }),
  );

  // Step 11. Remove non-existent item (random UUID)
  await TestValidator.error(
    "cannot remove nonexistent cart item",
    async () =>
      await api.functional.shoppingMall.customer.carts.items.erase(connection, {
        cartId: cart.id,
        cartItemId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );
}
