import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Validate that a product cannot be deleted when an active order is associated
 * with it.
 *
 * Steps:
 *
 * 1. Register as admin (to get privileges to create category and product)
 * 2. Create a category via admin
 * 3. Create a product in that category (using admin seller context)
 * 4. Register a new customer and note their address snapshot
 * 5. Simulate a valid address and payment method snapshot for order creation
 *    (mocked with same value if needed)
 * 6. Customer places an order using the product
 * 7. Admin attempts to delete the product (should fail with proper error)
 * 8. Assert that the error is due to active order existence
 */
export async function test_api_prevent_product_deletion_with_active_orders(
  connection: api.IConnection,
) {
  // 1. Register as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "secureAdminPass1234!",
        full_name: RandomGenerator.name(),
        status: "active",
      },
    });
  typia.assert(admin);
  // 2. Create a category via admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      },
    });
  typia.assert(category);
  // 3. Create a product in that category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        is_active: true,
      },
    });
  typia.assert(product);
  // 4. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "secureCustomerPass1234!",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: "Seoul",
          postal_code: "15300",
          address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          is_default: true,
        },
      },
    });
  typia.assert(customer);
  // 5. Simulate payment_method_id and use shipping_address_id from join response (should use customer.address)
  // For this test, mock both with UUIDs
  const shipping_address_id = typia.random<string & tags.Format<"uuid">>();
  const payment_method_id = typia.random<string & tags.Format<"uuid">>();
  // 6. Create an order as customer for the product
  // Use order_total = 10_000, currency = "KRW"
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shipping_address_id: shipping_address_id,
        payment_method_id: payment_method_id,
        order_total: 10000,
        currency: "KRW",
      },
    });
  typia.assert(order);
  // 7. Attempt to delete product
  await TestValidator.error(
    "product deletion prevented due to active order",
    async () => {
      await api.functional.shoppingMall.admin.products.erase(connection, {
        productId: product.id,
      });
    },
  );
}
