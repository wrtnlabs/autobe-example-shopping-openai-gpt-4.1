import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Assert that a seller cannot delete their product if it is referenced by an
 * active order.
 *
 * Steps:
 *
 * 1. Register a seller (auth + token acquisition).
 * 2. Create a seller role to satisfy RBAC.
 * 3. Create a category for product creation.
 * 4. Seller creates a product in the above category.
 * 5. Register a customer (auth + token).
 * 6. Customer places an order for that product (simulate order, supplying required
 *    order snapshot property values).
 * 7. Switch to seller context, attempt to delete the product.
 * 8. Validate that error is raised and product is NOT deleted.
 */
export async function test_api_prevent_product_deletion_by_seller_with_active_orders(
  connection: api.IConnection,
) {
  // 1. Register the seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "StrongPassw0rd!@#",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(13),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 2. Create the SELLER role (admin)
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Seller role for e2e tests",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // 3. Create a new category (admin/category management)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        description_ko: null,
        description_en: null,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 4. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Register the customer (with address)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const initAddress: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  };
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "StrongerPassw0rd#@!",
      full_name: RandomGenerator.name(3),
      phone: RandomGenerator.mobile(),
      address: initAddress,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 6. Customer creates an order for the product (simulate payment/address)
  const shipping_address_id = typia.random<string & tags.Format<"uuid">>(); // Simulate, as order creation requires shipping_address_id & payment_method_id
  const payment_method_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shipping_address_id: shipping_address_id,
        payment_method_id: payment_method_id,
        order_total: 5000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Switch to seller (already authenticated) and try to delete the product
  await TestValidator.error(
    "should not allow product deletion when active orders reference it",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productId: product.id,
      });
    },
  );
}
