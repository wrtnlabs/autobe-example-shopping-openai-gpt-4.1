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
 * E2E test for: Customer cart item update and ownership enforcement
 *
 * 1. Register customer (receive JWT session)
 * 2. Admin creates a channel, section, category for testing (channel data for
 *    customer)
 * 3. Seller creates a product on channel/section/category
 * 4. Seller creates a valid variant for the product (with sufficient stock)
 * 5. Customer creates cart referencing self, channel, section
 * 6. Customer adds cart item referencing product and variant (valid initial
 *    quantity)
 * 7. Customer updates the cart item (change variant and/or quantity and snapshot)
 * 8. Validate update response: changes are reflected
 *    (quantity/variant/option_snapshot)
 * 9. Validate audit (timestamps updated)
 * 10. Second customer tries to update this item (should get error)
 */
export async function test_api_cart_item_update_customer_ownership(
  connection: api.IConnection,
) {
  // 1. Register a customer (primary customer)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(), // TEMP, overwritten later
      name: RandomGenerator.name(),
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Admin creates a new Channel
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

  // 3. Admin creates a Section for the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Admin creates Category for the channel
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Seller creates a Product on this channel/section/category
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        status: "Active",
        business_status: "Approved",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Seller creates a Product Variant for the above product
  const variantSku = RandomGenerator.alphaNumeric(12);
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: variantSku,
          bar_code: null,
          option_values_hash: RandomGenerator.alphaNumeric(10),
          price: 10000,
          stock_quantity: 50,
          weight: 500,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 7. Customer creates new Cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerJoin.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 8. Customer adds an Item to the Cart
  const optionSnapshot = JSON.stringify({ color: "blue", size: "M" });
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: variant.id,
        quantity: 1,
        option_snapshot: optionSnapshot,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 9. Customer updates the Cart Item: change quantity and option snapshot
  const newOptionSnapshot = JSON.stringify({ color: "red", size: "L" });
  const updateQty = 2;
  const updated = await api.functional.shoppingMall.customer.carts.items.update(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
      body: {
        quantity: updateQty,
        option_snapshot: newOptionSnapshot,
      } satisfies IShoppingMallCartItem.IUpdate,
    },
  );
  typia.assert(updated);

  // Validation: quantity/option_snapshot change
  TestValidator.equals(
    "cart item quantity updated",
    updated.quantity,
    updateQty,
  );
  TestValidator.equals(
    "cart item option_snapshot updated",
    updated.option_snapshot,
    newOptionSnapshot,
  );
  TestValidator.equals(
    "cart item ownership preserved",
    updated.shopping_mall_cart_id,
    cart.id,
  );

  // Validate audit: updated_at changed
  TestValidator.notEquals(
    "updated_at should update on change",
    updated.updated_at,
    cartItem.updated_at,
  );

  // 10. Second customer cannot update
  // Register second customer
  const secondCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(secondCustomer);

  // Switch connection to second customer (simulate session)
  connection.headers = {
    ...connection.headers,
    Authorization: secondCustomer.token.access,
  };
  await TestValidator.error("other customer cannot update item", async () => {
    await api.functional.shoppingMall.customer.carts.items.update(connection, {
      cartId: cart.id,
      cartItemId: cartItem.id,
      body: {
        quantity: 3,
      } satisfies IShoppingMallCartItem.IUpdate,
    });
  });
}
