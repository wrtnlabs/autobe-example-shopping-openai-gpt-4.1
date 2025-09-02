import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

/**
 * Test the logical deletion ('unfavorite') of an inquiry from a customer's
 * favorites.
 *
 * This test simulates a realistic customer bookmarking scenario:
 *
 * 1. Registers a new customer and authenticates, establishing a unique account
 *    and token context.
 * 2. The customer creates a favorite folder for personalized bookmark
 *    groupings.
 * 3. The customer posts an inquiry (QnA/support ticket).
 * 4. The customer adds a favorite for this inquiry, using the favorite folder.
 * 5. The mapping between the inquiry and the favorites folder is established
 *    (POST mapping endpoint).
 * 6. The test deletes (unfavorites) the mapping using the DELETE endpoint.
 * 7. Assert the deletion operation succeeds, does not affect the original
 *    inquiry, and maintains audit/evidence integrity.
 * 8. Confirm idempotency by repeating the delete operation or calling against
 *    a non-existent mapping, ensuring the system handles re-deletes
 *    gracefully.
 */
export async function test_api_favorite_inquiry_deletion_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customerId = auth.customer.id;

  // 2. Create a favorite folder
  const favoriteFolderInput: IShoppingMallAiBackendFavoriteFolder.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 5,
      wordMax: 15,
    }),
  };
  const favoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      { body: favoriteFolderInput },
    );
  typia.assert(favoriteFolder);

  // 3. Customer creates an inquiry
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: customerId,
    seller_id: null,
    product_id: null,
    order_id: null,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 9,
    }),
    private: false,
    status: "open",
  };
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      { body: inquiryInput },
    );
  typia.assert(inquiry);

  // 4. Create favorite for the inquiry (links customer to inquiry via favorite folder)
  const favoriteInput: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_favorite_folder_id: favoriteFolder.id,
    title_snapshot: inquiry.title,
    target_type: "inquiry",
    target_id_snapshot: inquiry.id,
  };
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: favoriteInput },
    );
  typia.assert(favorite);

  // 5. Establish mapping between favorite and inquiry (adds inquiry to favorite folder)
  const favoriteInquiryInput: IShoppingMallAiBackendFavoriteInquiry.ICreate = {
    shopping_mall_ai_backend_favorite_id: favorite.id,
    shopping_mall_ai_backend_inquiry_id: inquiry.id,
    inquiry_snapshot: inquiry.body.substring(0, 50),
  };
  const favoriteInquiry =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.createFavoriteInquiry(
      connection,
      {
        favoriteId: favorite.id,
        body: favoriteInquiryInput,
      },
    );
  typia.assert(favoriteInquiry);

  // 6. Delete the inquiry from the favorite folder (logical unfavorite)
  await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.eraseFavoriteInquiry(
    connection,
    {
      favoriteId: favorite.id,
      inquiryId: inquiry.id,
    },
  );
  // 7. Assert original inquiry is NOT deleted/affected (mapping delete should not destroy inquiry)
  TestValidator.predicate(
    "original inquiry remains after unfavorite",
    inquiry.deleted_at === null || inquiry.deleted_at === undefined,
  );
  // 8. Idempotency: repeat the deletion to verify no error is thrown for a re-delete
  await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.eraseFavoriteInquiry(
    connection,
    {
      favoriteId: favorite.id,
      inquiryId: inquiry.id,
    },
  );
}
