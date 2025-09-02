import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieve a customer's favorited inquiry by inquiryId within a given favorite
 * group/folder.
 *
 * Returns a current snapshot containing metadata, inquiry content, and status
 * for one favorited Q&A thread, enforcing evidence preservation and customer
 * ownership.
 *
 * Authorization: Only the customer who owns the favorite group may access the
 * favorited inquiry, and only if the group is not deleted.
 *
 * @param props - The props for the request
 * @param props.customer - CustomerPayload representing the authenticated
 *   customer (ownership required)
 * @param props.favoriteId - The id of the favorite entity/folder
 * @param props.inquiryId - The id of the inquiry (Q&A or support thread) to
 *   retrieve
 * @returns IShoppingMallAiBackendFavoriteInquiry object with evidence metadata
 *   suitable for detailed, notification, and audit use cases
 * @throws {Error} If the mapping is not found, favorite doesn't exist, is
 *   deleted, or the user isn't owner
 */
export async function get__shoppingMallAiBackend_customer_favorites_$favoriteId_inquiries_$inquiryId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavoriteInquiry> {
  const { customer, favoriteId, inquiryId } = props;

  // Fetch favorite-inquiry mapping by composite key
  const favoriteInquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.findUnique(
      {
        where: {
          shopping_mall_ai_backend_favorite_id_shopping_mall_ai_backend_inquiry_id:
            {
              shopping_mall_ai_backend_favorite_id: favoriteId,
              shopping_mall_ai_backend_inquiry_id: inquiryId,
            },
        },
      },
    );
  if (!favoriteInquiry) {
    throw new Error(
      "Favorite inquiry mapping not found (either missing, deleted, or wrong IDs)",
    );
  }

  // Fetch parent favorite and validate ownership and not deleted
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findUnique({
      where: { id: favoriteId },
    });
  if (
    !favorite ||
    favorite.shopping_mall_ai_backend_customer_id !== customer.id ||
    favorite.deleted_at !== null
  ) {
    throw new Error(
      "Unauthorized: Only the owner can access this favorite, or favorite is deleted",
    );
  }

  // Return with correct typing/branding and date conversion
  return {
    id: favoriteInquiry.id,
    shopping_mall_ai_backend_favorite_id:
      favoriteInquiry.shopping_mall_ai_backend_favorite_id,
    shopping_mall_ai_backend_inquiry_id:
      favoriteInquiry.shopping_mall_ai_backend_inquiry_id,
    inquiry_snapshot: favoriteInquiry.inquiry_snapshot ?? null,
    created_at: toISOStringSafe(favoriteInquiry.created_at),
  };
}
