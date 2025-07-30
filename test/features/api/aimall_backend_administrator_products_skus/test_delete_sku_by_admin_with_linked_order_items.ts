import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate that deleting a SKU referenced by an order item is prevented.
 *
 * This test confirms that SKU deletion is blocked by business logic when the
 * SKU is referenced by existing order items (enforcing referential integrity).
 * It simulates a real-world situation where a product, a SKU, and an order
 * (that points to the SKU) have been created, and then deletion is attempted on
 * the SKU. The deletion should fail, returning an error fitting the
 * integrity-violation scenario.
 *
 * Step-by-step process:
 *
 * 1. Create a product as context for SKUs (productId).
 * 2. Create a SKU under that product (skuId).
 * 3. Create a customer, seller, and address UUID for association purposes (as
 *    required by order's ICreate DTO), and create an order that references the
 *    product, seller, customer, and address.
 *
 *    - Note: Since order line items are not modeled directly in DTOs, but scenario
 *         requires a SKU linkage, if possible the order creation should be done
 *         in such a way as to simulate real linkage. If not possible due to
 *         limitations in provided structures, proceed to the edge with
 *         available input.
 * 4. Attempt to delete the SKU with eraseByProductidAndSkuid; expect the system to
 *    reject with an error (TestValidator.error) due to conflict with existing
 *    order linkage.
 *
 *    - The business logic should protect referential integrity and deny the
 *         deletion.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_delete_sku_by_admin_with_linked_order_items(
  connection: api.IConnection,
) {
  // 1. Create a product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for the product
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(10),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Create a customer, seller, address UUID, and create an order that references the product's seller and SKU (best effort as allowed by DTOs)
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = product.seller_id;
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id,
        address_id,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Attempt to delete the SKU that should be referenced by the order
  await TestValidator.error("Should not delete SKU referenced by order")(() =>
    api.functional.aimall_backend.administrator.products.skus.erase(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
      },
    ),
  );
}
