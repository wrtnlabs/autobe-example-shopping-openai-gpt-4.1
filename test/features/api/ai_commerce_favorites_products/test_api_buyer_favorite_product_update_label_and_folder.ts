import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceFavoritesProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProducts";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Test updating label and folder of a buyer's favorite product.
 *
 * Scenario:
 *
 * 1. Register & login as a buyer (unique email/password).
 * 2. Create a favorite product (random valid product_id UUID, optionally
 *    label/folder).
 * 3. Update the favorite's label and folder_id to new unique values (random
 *    valid label & folder_id UUID).
 * 4. Retrieve and check: updated label/folder are present, immutable fields
 *    unchanged (product_id, snapshot_id, timestamps updated), type
 *    assertion passes.
 * 5. Optionally: update only label, then only folder, then without changes to
 *    validate API supports partial and no-op updates.
 */
export async function test_api_buyer_favorite_product_update_label_and_folder(
  connection: api.IConnection,
) {
  // 1. Register & login with a unique buyer account
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const auth = await api.functional.auth.buyer.join(connection, {
    body: { email, password } satisfies IBuyer.ICreate,
  });
  typia.assert(auth);

  // 2. Create a favorite product (random product_id)
  const initialFavorite =
    await api.functional.aiCommerce.buyer.favorites.products.create(
      connection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAiCommerceFavoritesProducts.ICreate,
      },
    );
  typia.assert(initialFavorite);

  // 3. Update label and folder_id
  const newLabel = RandomGenerator.paragraph({ sentences: 2 });
  const newFolderId = typia.random<string & tags.Format<"uuid">>();
  const updatedFavorite =
    await api.functional.aiCommerce.buyer.favorites.products.update(
      connection,
      {
        favoriteProductId: initialFavorite.id,
        body: {
          label: newLabel,
          folder_id: newFolderId,
        } satisfies IAiCommerceFavoritesProducts.IUpdate,
      },
    );
  typia.assert(updatedFavorite);
  TestValidator.equals("label updated", updatedFavorite.label, newLabel);
  TestValidator.equals(
    "folder_id updated",
    updatedFavorite.folder_id,
    newFolderId,
  );
  TestValidator.equals(
    "product_id unchanged",
    updatedFavorite.product_id,
    initialFavorite.product_id,
  );

  // 4. Update only label (folder_id omitted), verify label, folder_id unchanged
  const anotherLabel = RandomGenerator.paragraph({ sentences: 3 });
  const onlyLabel =
    await api.functional.aiCommerce.buyer.favorites.products.update(
      connection,
      {
        favoriteProductId: initialFavorite.id,
        body: {
          label: anotherLabel,
        } satisfies IAiCommerceFavoritesProducts.IUpdate,
      },
    );
  typia.assert(onlyLabel);
  TestValidator.equals("label updated only", onlyLabel.label, anotherLabel);
  TestValidator.equals("folder_id untouched", onlyLabel.folder_id, newFolderId);

  // 5. Update only folder_id (label omitted), verify folder_id, label unchanged
  const anotherFolderId = typia.random<string & tags.Format<"uuid">>();
  const onlyFolder =
    await api.functional.aiCommerce.buyer.favorites.products.update(
      connection,
      {
        favoriteProductId: initialFavorite.id,
        body: {
          folder_id: anotherFolderId,
        } satisfies IAiCommerceFavoritesProducts.IUpdate,
      },
    );
  typia.assert(onlyFolder);
  TestValidator.equals(
    "folder_id updated only",
    onlyFolder.folder_id,
    anotherFolderId,
  );
  TestValidator.equals(
    "label untouched after only folder update",
    onlyFolder.label,
    anotherLabel,
  );

  // 6. No changes (empty body, both fields undefined) - should be no error or change
  const noChange =
    await api.functional.aiCommerce.buyer.favorites.products.update(
      connection,
      {
        favoriteProductId: initialFavorite.id,
        body: {},
      },
    );
  typia.assert(noChange);
  TestValidator.equals(
    "label unchanged on no-op update",
    noChange.label,
    anotherLabel,
  );
  TestValidator.equals(
    "folder_id unchanged on no-op update",
    noChange.folder_id,
    anotherFolderId,
  );

  // Confirm product_id remains the same throughout
  TestValidator.equals(
    "product_id stable across all updates",
    noChange.product_id,
    initialFavorite.product_id,
  );
}

/**
 * Review of the draft implementation reveals no violations. All API calls use
 * await and imported types from the available DTOs. Random data uses the
 * correct typia.random syntax and tags. Each test assertion uses TestValidator
 * with a descriptive first title. No type error tests, wrong data types,
 * missing required fields, or extraneous imports/altered template are present.
 * The function thoroughly validates updates for label and folder_id, with
 * partial and no-op updates. All logic is TypeScript strict and matches
 * available schema. No code needs to be deleted. The function is
 * production-ready in its current form.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O All API calls use proper parameter structure and type safety
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly without manual token management
 *   - O Follows proper TypeScript conventions and type safety practices
 */
const __revise = {};
__revise;
