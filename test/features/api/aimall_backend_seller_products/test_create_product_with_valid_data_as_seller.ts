import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate seller product creation with valid data
 *
 * This test checks:
 *
 * 1. Assumes seller authentication (connection context).
 * 2. The seller calls the create endpoint with all required fields.
 * 3. The API returns a fully populated product entity, including an ID,
 *    timestamps, and all given fields.
 * 4. The output type is validated and main property values are confirmed to match
 *    input (category_id, seller_id, title, optional description/thumbnail,
 *    status).
 * 5. (Persistence or round-trip confirmation via listing/detail is not possible
 *    with supplied API, so focus is on returned object validity and type
 *    correctness.)
 */
export async function test_api_aimall_backend_seller_products_test_create_product_with_valid_data_as_seller(
  connection: api.IConnection,
) {
  // 1. Prepare valid data for product creation (simulate a seller with owned category)
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: "E2E Test Product Title " + RandomGenerator.alphaNumeric(6),
    description: "Full product description for E2E test.",
    main_thumbnail_uri: "https://example.com/main_thumbnail.png",
    status: "active",
  };

  // 2. Call the product creation API as the authenticated seller
  const result = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(result);

  // 3. Validate returned fields match input and system fields exist and are well-formed
  TestValidator.equals("category_id")(result.category_id)(
    productInput.category_id,
  );
  TestValidator.equals("seller_id")(result.seller_id)(productInput.seller_id);
  TestValidator.equals("title")(result.title)(productInput.title);
  TestValidator.equals("description")(result.description)(
    productInput.description,
  );
  TestValidator.equals("main_thumbnail_uri")(result.main_thumbnail_uri)(
    productInput.main_thumbnail_uri,
  );
  TestValidator.equals("status")(result.status)(productInput.status);

  TestValidator.predicate("id is UUID")(
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.predicate("created_at is date-time")(
    typeof result.created_at === "string" &&
      !isNaN(Date.parse(result.created_at)),
  );
  TestValidator.predicate("updated_at is date-time")(
    typeof result.updated_at === "string" &&
      !isNaN(Date.parse(result.updated_at)),
  );
}
