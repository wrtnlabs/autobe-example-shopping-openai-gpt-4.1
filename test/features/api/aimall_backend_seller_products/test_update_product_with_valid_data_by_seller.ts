import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate successful product update by a seller with valid credentials.
 *
 * Business Context: This test ensures that a seller, once onboarded in the
 * system, can update details of one of their products through the appropriate
 * API endpoint. It confirms that only valid, authenticated sellers can perform
 * updates on their own products, and any changes made are persisted and
 * accurately reflected in the returned entity. Update candidates include
 * editable fields such as title, description, status, category assignment, and
 * thumbnail URI.
 *
 * Steps:
 *
 * 1. Register a new seller using the administrator/sellers creation endpoint.
 * 2. Create a category UUID for category_id (since no category creation API is
 *    exposed, use a random UUID for matching in both create and update).
 * 3. As the new seller, create a product with initial values for title,
 *    description, status, and the randomly generated category.
 * 4. Issue an update to the product via PUT, changing at least two mutable fields
 *    (e.g., title and description), and optionally the status/category or
 *    thumbnail. Use the productId from the original creation response.
 * 5. Assert that the updated product's fields match the submitted changes, and all
 *    unchanged fields persist as before. Ensure updated_at has changed (if
 *    possible).
 */
export async function test_api_aimall_backend_seller_products_test_update_product_with_valid_data_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Prepare a fake category UUID (assuming catalog exists)
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create an initial product owned by the seller
  const initialProductInput: IAimallBackendProduct.ICreate = {
    category_id: categoryId,
    seller_id: seller.id,
    title: "Original product title",
    description: "This is the product's original description.",
    main_thumbnail_uri: "https://example.com/original-thumb.jpg",
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: initialProductInput },
  );
  typia.assert(product);

  // 4. Update at least two mutable fields (title and description), and optionally others
  const updatedTitle = "Updated product title";
  const updatedDescription = "This description has been updated.";
  const updatedStatus = "inactive";
  const updatedThumbnail = "https://example.com/updated-thumb.jpg";

  const updateInput: IAimallBackendProduct.IUpdate = {
    title: updatedTitle,
    description: updatedDescription,
    status: updatedStatus,
    main_thumbnail_uri: updatedThumbnail,
  };
  const updatedProduct =
    await api.functional.aimall_backend.seller.products.update(connection, {
      productId: product.id,
      body: updateInput,
    });
  typia.assert(updatedProduct);

  // 5. Assert updated fields match, and unchanged fields are preserved
  TestValidator.equals("product id unchanged")(updatedProduct.id)(product.id);
  TestValidator.equals("seller ownership unchanged")(updatedProduct.seller_id)(
    seller.id,
  );
  TestValidator.equals("category unchanged")(updatedProduct.category_id)(
    product.category_id,
  );

  TestValidator.equals("updated title")(updatedProduct.title)(updatedTitle);
  TestValidator.equals("updated description")(updatedProduct.description)(
    updatedDescription,
  );
  TestValidator.equals("updated status")(updatedProduct.status)(updatedStatus);
  TestValidator.equals("updated thumbnail")(updatedProduct.main_thumbnail_uri)(
    updatedThumbnail,
  );

  // The updated_at field should be different
  TestValidator.notEquals("updated_at has changed")(updatedProduct.updated_at)(
    product.updated_at,
  );
}
