import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test admin audit access to cart item detail.
 *
 * End-to-end: create admin, create channel/section/category, create product &
 * variant, create customer & cart, add cart item, and validate admin GET access
 * to detailed cart item info.
 */
export async function test_api_cart_item_detail_admin_view(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminPass123!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create category
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphabets(6),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallChannelCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Register a product as a seller (simulate seller by admin since seller APIs aren't exposed)
  // Use arbitrary UUID for seller to match type constraints
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(3),
        status: "Active",
        business_status: "Approval",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Add a variant (SKU) for the product
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: {
          shopping_mall_product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(12),
          bar_code: null,
          option_values_hash: RandomGenerator.alphaNumeric(8),
          price: 12000,
          stock_quantity: 77,
          weight: 1.23,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);

  // 7. Register a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        password: "custPass123!",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 8. Create customer cart
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

  // 9. Add item (product variant) to cart
  const option_snapshot = JSON.stringify({
    variantHash: variant.option_values_hash,
  });
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_product_variant_id: variant.id,
        quantity: 2,
        option_snapshot: option_snapshot,
      } satisfies IShoppingMallCartItem.ICreate,
    });
  typia.assert(cartItem);

  // 10. Retrieve item as admin
  const result = await api.functional.shoppingMall.admin.carts.items.at(
    connection,
    {
      cartId: cart.id,
      cartItemId: cartItem.id,
    },
  );
  typia.assert(result);

  // Validate core fields match
  TestValidator.equals("cart item id matches", result.id, cartItem.id);
  TestValidator.equals(
    "product id matches",
    result.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "variant id matches",
    result.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals(
    "cart id matches",
    result.shopping_mall_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "option snapshot matches",
    result.option_snapshot,
    option_snapshot,
  );
  TestValidator.equals("quantity matches", result.quantity, 2);
}
