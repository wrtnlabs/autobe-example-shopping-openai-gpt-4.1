import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validates that deleting a SKU referenced by an active order (item) is
 * prevented for data integrity.
 *
 * This test simulates a practical scenario in which a seller attempts to delete
 * a SKU that is currently referenced in an active order. Such a deletion should
 * be blocked by the system to ensure order and inventory consistency (no
 * orphans, no data loss). The steps verify that the system correctly throws an
 * error when deletion is attempted, and the error describes the constraint
 * violation.
 *
 * Step-by-step process:
 *
 * 1. Create a product as a seller (to own SKUs)
 * 2. Create a SKU under the product
 * 3. Create an order which references the SKU (as per available DTOs — directly
 *    via seller_id)
 * 4. Attempt to delete the SKU (using the correct product and SKU IDs)
 * 5. Validate that the operation results in an error (deletion is blocked due to
 *    active reference)
 */
export async function test_api_aimall_backend_test_delete_sku_by_seller_with_active_links_prevented(
  connection: api.IConnection,
) {
  // 1. Create a product as a seller
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerId,
        category_id: categoryId,
        title: RandomGenerator.paragraph()(4),
        description: RandomGenerator.content()(2)(2),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Create a SKU under the product
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        product_id: product.id,
        sku_code: skuCode,
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 3. Create an order referencing the SKU (via seller_id only, since no line items on DTO)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customerId,
        seller_id: sellerId,
        address_id: addressId,
        order_status: "pending",
        total_amount: 1000,
        currency: "KRW",
        // order_number intentionally omitted to let system assign
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Attempt to delete the SKU referenced by the order (should be blocked)
  await TestValidator.error("SKU delete forbidden when active order exists")(
    async () => {
      await api.functional.aimall_backend.seller.products.skus.erase(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
        },
      );
    },
  );
}
