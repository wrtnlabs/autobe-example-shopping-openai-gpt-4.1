import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test full inventory record PUT replacement for a SKU by the SKU's seller.
 *
 * Steps:
 *
 * 1. Create SELLER role (admin)
 * 2. Create product category (admin)
 * 3. Seller registration
 * 4. Seller creates product in the category
 * 5. Seller creates SKU for the product
 * 6. Seller fully replaces its inventory for given fields (PUT)
 * 7. Validate field updates on response (assertion)
 * 8. PUT again with radical changes (e.g., 0 available, blocked status)
 * 9. Attempt to update as another seller, expect failure
 *
 * Edge cases: setting available=0, blocked status, updating sold count, all
 * integer constraints. All operations must strictly comply with DTO/business
 * requirements and only documented properties. Negative: non-owner update
 * forbidden.
 */
export async function test_api_inventory_full_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Create SELLER role as admin
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Seller who can manage products and inventory",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(sellerRole);

  // 2. Create product category as admin
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        name_en: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 12,
        }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Seller registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "s3cr3tPassw0rd#1",
        business_name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 7,
          wordMax: 18,
        }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
        kyc_document_uri: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 4. Seller creates product in category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 25,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 10,
        }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Seller creates SKU for product
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(14),
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 10,
          wordMax: 25,
        }),
        price: Math.round(Math.random() * 100000) + 10000,
        status: "active",
        low_stock_threshold: null,
        main_image_url: null,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(sku);

  // 6. Seller fully replaces SKU inventory: first with valid values
  const updateBody = {
    quantity_available: 50,
    quantity_reserved: 10,
    quantity_sold: 100,
    status: "in_stock",
    low_stock_threshold: 5,
  } satisfies IShoppingMallInventoryRecord.IUpdate;

  const updated: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.seller.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "quantity_available updated",
    updated.quantity_available,
    50,
  );
  TestValidator.equals(
    "quantity_reserved updated",
    updated.quantity_reserved,
    10,
  );
  TestValidator.equals("quantity_sold updated", updated.quantity_sold, 100);
  TestValidator.equals("status updated", updated.status, "in_stock");
  TestValidator.equals(
    "low_stock_threshold updated",
    updated.low_stock_threshold,
    5,
  );

  // 7. Edge case: zero available, blocked status
  const radicalUpdate = {
    quantity_available: 0,
    quantity_reserved: 0,
    quantity_sold: 200,
    status: "blocked",
    low_stock_threshold: 0,
  } satisfies IShoppingMallInventoryRecord.IUpdate;
  const updatedRadical: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.seller.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: radicalUpdate,
      },
    );
  typia.assert(updatedRadical);
  TestValidator.equals(
    "radical available = 0",
    updatedRadical.quantity_available,
    0,
  );
  TestValidator.equals(
    "radical reserved = 0",
    updatedRadical.quantity_reserved,
    0,
  );
  TestValidator.equals("radical sold = 200", updatedRadical.quantity_sold, 200);
  TestValidator.equals(
    "radical status = blocked",
    updatedRadical.status,
    "blocked",
  );
  TestValidator.equals(
    "radical low stock threshold=0",
    updatedRadical.low_stock_threshold,
    0,
  );

  // 8. Negative - as non-owner seller, cannot update (join new seller, try to update, expect error)
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(
      { ...connection, headers: {} },
      {
        body: {
          email: otherSellerEmail,
          password: "an0th3rPassw@rd",
          business_name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 8,
            wordMax: 18,
          }),
          contact_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          business_registration_number: RandomGenerator.alphaNumeric(10),
          kyc_document_uri: null,
        } satisfies IShoppingMallSeller.IJoin,
      },
    );
  typia.assert(otherSeller);

  await TestValidator.error(
    "non-owner seller cannot update inventory",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.inventory.update(
        { ...connection, headers: { Authorization: otherSeller.token.access } },
        {
          productId: product.id,
          skuId: sku.id,
          body: {
            quantity_available: 20,
            quantity_reserved: 2,
            quantity_sold: 201,
            status: "in_stock",
            low_stock_threshold: 5,
          } satisfies IShoppingMallInventoryRecord.IUpdate,
        },
      );
    },
  );
}
