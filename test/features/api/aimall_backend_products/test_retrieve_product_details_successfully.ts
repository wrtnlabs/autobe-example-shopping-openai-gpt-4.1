import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * E2E test to verify full retrieval of product details by productId.
 *
 * This test validates that, when a valid product is created, its detailed
 * attributes can be retrieved using its productId via the GET
 * /aimall-backend/products/{productId} endpoint. All normalized, public, and
 * business critical fields must be present and the values should exactly match
 * those originally supplied.
 *
 * Steps:
 *
 * 1. Create a new product by calling the product creation endpoint using valid,
 *    realistic data (dependency).
 * 2. Retrieve the created product's details by its unique id using the target
 *    retrieval endpoint.
 * 3. Assert that all expected fields (id, category_id, seller_id, title,
 *    description, main_thumbnail_uri, status, created_at, updated_at) exist.
 * 4. Confirm that all fields except auto-generated (id, created_at, updated_at)
 *    match the inserted data for this product.
 * 5. Validate type safety and check that the values returned are correct and
 *    normalized.
 */
export async function test_api_aimall_backend_products_at(
  connection: api.IConnection,
) {
  // 1. Create a product with required and optional fields
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: typia.random<string & tags.Format<"uri">>(),
    status: "active",
  };

  const created: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(created);

  // 2. Retrieve by productId
  const retrieved: IAimallBackendProduct =
    await api.functional.aimall_backend.products.at(connection, {
      productId: created.id,
    });
  typia.assert(retrieved);

  // 3. All essential fields must exist
  TestValidator.predicate("all fields present")(
    Boolean(retrieved.id) &&
      Boolean(retrieved.category_id) &&
      Boolean(retrieved.seller_id) &&
      Boolean(retrieved.title) &&
      typeof retrieved.status === "string" &&
      typeof retrieved.created_at === "string" &&
      typeof retrieved.updated_at === "string",
  );

  // 4. Fields should match what was supplied
  TestValidator.equals("category_id matches")(retrieved.category_id)(
    productInput.category_id,
  );
  TestValidator.equals("seller_id matches")(retrieved.seller_id)(
    productInput.seller_id,
  );
  TestValidator.equals("title matches")(retrieved.title)(productInput.title);
  TestValidator.equals("description matches")(retrieved.description)(
    productInput.description,
  );
  TestValidator.equals("main_thumbnail_uri matches")(
    retrieved.main_thumbnail_uri,
  )(productInput.main_thumbnail_uri);
  TestValidator.equals("status matches")(retrieved.status)(productInput.status);

  // 5. created_at and updated_at must be present and in date-time format
  TestValidator.predicate("created_at valid format")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.created_at),
  );
  TestValidator.predicate("updated_at valid format")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrieved.updated_at),
  );
}
