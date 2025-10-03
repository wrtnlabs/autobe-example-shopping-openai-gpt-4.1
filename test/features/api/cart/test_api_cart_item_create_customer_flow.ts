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
 * Validates a new-customer cart add-item flow from channel creation.
 *
 * Business context: Ensures a new channel and its section/category can have a
 * product registered, a customer properly signed up, and all linkages succeed
 * through the cart-item add flow. The test covers the linkage chain: channel ->
 * section -> category -> product -> variant -> customer -> cart -> cart item,
 * enforcing stock, linkage, and evidence constraints.
 */
export async function test_api_cart_item_create_customer_flow(
  connection: api.IConnection,
) {
  // 1. Create channel
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelInput },
  );
  typia.assert(channel);

  // 2. Create section
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(1),
    display_order: 1,
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

  // 3. Create category
  const categoryInput = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    display_order: 1,
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

  // 4. Register new customer in the channel
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerInput = {
    shopping_mall_channel_id: channel.id,
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customer);
  TestValidator.equals(
    "registered customer email",
    customer.email,
    customerEmail,
  );
  TestValidator.equals(
    "linked channel",
    customer.shopping_mall_channel_id,
    channel.id,
  );

  // 5. Register product as seller (mocked as if seller context is available)
  const sellerId = typia.random<string & tags.Format<"uuid">>(); // No actual seller registration API
  const productCode = RandomGenerator.alphaNumeric(10);
  const productInput = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_category_id: category.id,
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 6. Register a product variant
  const variantInput = {
    shopping_mall_product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(8),
    option_values_hash: RandomGenerator.alphaNumeric(16),
    price: 10000,
    stock_quantity: 100,
    weight: 1,
  } satisfies IShoppingMallProductVariant.ICreate;
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      connection,
      {
        productId: product.id,
        body: variantInput,
      },
    );
  typia.assert(variant);

  // 7. Create new shopping cart for the customer
  const cartInput = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);

  // 8. Add the product with selected variant and quantity to the cart
  const cartItemInput = {
    shopping_mall_product_id: product.id,
    shopping_mall_product_variant_id: variant.id,
    quantity: 3,
    option_snapshot: JSON.stringify({
      sku_code: variant.sku_code,
      option_values_hash: variant.option_values_hash,
    }),
  } satisfies IShoppingMallCartItem.ICreate;
  const cartItem =
    await api.functional.shoppingMall.customer.carts.items.create(connection, {
      cartId: cart.id,
      body: cartItemInput,
    });
  typia.assert(cartItem);

  TestValidator.equals("cart linkage", cartItem.shopping_mall_cart_id, cart.id);
  TestValidator.equals(
    "product linkage",
    cartItem.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "variant linkage",
    cartItem.shopping_mall_product_variant_id,
    variant.id,
  );
  TestValidator.equals("quantity", cartItem.quantity, 3);
  TestValidator.predicate("option snapshot evidences correct SKU/info", () => {
    try {
      const snapshot = JSON.parse(cartItem.option_snapshot);
      return (
        snapshot.sku_code === variant.sku_code &&
        snapshot.option_values_hash === variant.option_values_hash
      );
    } catch (_) {
      return false;
    }
  });
}
