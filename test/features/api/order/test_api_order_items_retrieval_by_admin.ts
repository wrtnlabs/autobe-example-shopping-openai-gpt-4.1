import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate that an admin can retrieve a paginated list of order items for a
 * specific order, with correct filtering and access control.
 *
 * 1. Register admin account and login (admin context is established).
 * 2. Register customer account with a valid address.
 * 3. Create shipping address snapshot for the order.
 * 4. Create payment method snapshot for the order (admin context).
 * 5. Switch to customer, create an order using the address and payment method,
 *    specifying a known order_total and currency.
 * 6. Switch to admin, retrieve items for the order with default and custom
 *    pagination/filtering.
 * 7. Validate that response pagination/data matches expectations (page/limit/data
 *    fields present, values correct, items correct for order).
 * 8. Test edge case: retrieval using a non-existent orderId (should fail).
 * 9. Test with insufficient admin authorization (simulate by using customer
 *    context instead of admin, should fail).
 */
export async function test_api_order_items_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strongPa55!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register customer account (customer gets token)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "custSecure8*",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          address_line2: RandomGenerator.paragraph({ sentences: 1 }),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Customer creates an order address snapshot (simulate checkout address)
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "custSecure8*",
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        address_line2: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Create payment method snapshot (admin context)
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Switch to customer, create an order referencing orderAddress & paymentMethod
  const orderTotal = 10000;
  const orderCurrency = "KRW";
  const customerOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: orderCurrency,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(customerOrder);

  // 6. Retrieve items for the order as admin with default pagination/filter
  const itemsPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.admin.orders.items.index(connection, {
      orderId: customerOrder.id,
      body: {},
    });
  typia.assert(itemsPage);
  TestValidator.predicate(
    "At least one order item exists",
    itemsPage.data.length > 0,
  );

  // 7. Validate required pagination/data fields for returned order items
  TestValidator.predicate(
    "Pagination fields are present",
    !!itemsPage.pagination &&
      typeof itemsPage.pagination.current === "number" &&
      typeof itemsPage.pagination.limit === "number",
  );

  // 8. Test edge: retrieving using a non-existent orderId (should fail)
  await TestValidator.error(
    "Retrieving items for non-existent order should fail",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.index(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      });
    },
  );

  // 9. Test with insufficient admin authorization (simulate customer tries admin endpoint)
  // Simulate by registering a new customer context and calling as them.
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "custOther9#",
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        address_line2: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherCustomer);
  // Try admin retrieval as customer context (should fail)
  await TestValidator.error(
    "Customer cannot access admin order items endpoint",
    async () => {
      await api.functional.shoppingMall.admin.orders.items.index(connection, {
        orderId: customerOrder.id,
        body: {},
      });
    },
  );

  // 10. Test filtering by item_name (if at least one exists)
  const firstItem = itemsPage.data[0];
  if (firstItem && firstItem.item_name) {
    const filteredPage =
      await api.functional.shoppingMall.admin.orders.items.index(connection, {
        orderId: customerOrder.id,
        body: { product_name: firstItem.item_name },
      });
    typia.assert(filteredPage);
    TestValidator.predicate(
      "Filtered order item by product_name exists",
      filteredPage.data.length > 0,
    );
  }
  // 11. Test pagination: request page 1, limit 1 if more than one item exists
  if (itemsPage.data.length > 1) {
    const paged = await api.functional.shoppingMall.admin.orders.items.index(
      connection,
      {
        orderId: customerOrder.id,
        body: { page: 1, limit: 1 },
      },
    );
    typia.assert(paged);
    TestValidator.equals("Limit is 1", paged.pagination.limit, 1);
    TestValidator.predicate("Paged order item exists", paged.data.length === 1);
  }
}
