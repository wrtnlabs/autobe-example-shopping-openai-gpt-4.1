import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Get properties/metadata for a specific favorite folder owned by the customer.
 *
 * Fetches metadata and configuration details for a specific favorite folder
 * using its unique folder ID. Returns summary information such as name,
 * description, associated customer, creation/update times, and deletion status
 * (for evidence/audit). Only the folder's owner may retrieve its details;
 * security and evidence logic are enforced for compliance.
 *
 * Used by UIs for folder editing, notification channel management, and
 * organizing grouped favorites such as products, addresses, or inquiries.
 * Folders are central to personalized content and notification management
 * flows, supporting higher engagement and content discoverability.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 *   (CustomerPayload from JWT)
 * @param props.favoriteFolderId - The unique identifier of the favorite folder
 *   to retrieve (UUID)
 * @returns Metadata and summary configuration info for the folder
 *   (IShoppingMallAiBackendFavoriteFolder)
 * @throws {Error} When the folder does not exist, is deleted, or does not
 *   belong to authenticated customer
 */
export async function get__shoppingMallAiBackend_customer_favoriteFolders_$favoriteFolderId(props: {
  customer: CustomerPayload;
  favoriteFolderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendFavoriteFolder> {
  const { customer, favoriteFolderId } = props;
  const folder =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.findUnique({
      where: { id: favoriteFolderId },
    });
  if (!folder || folder.deleted_at) {
    throw new Error("Favorite folder not found or already deleted");
  }
  if (folder.shopping_mall_ai_backend_customer_id !== customer.id) {
    throw new Error("Forbidden: Not the owner of this folder");
  }
  return {
    id: folder.id,
    shopping_mall_ai_backend_customer_id:
      folder.shopping_mall_ai_backend_customer_id,
    name: folder.name,
    description: folder.description ?? null,
    created_at: toISOStringSafe(folder.created_at),
    updated_at: toISOStringSafe(folder.updated_at),
    deleted_at: folder.deleted_at ? toISOStringSafe(folder.deleted_at) : null,
  };
}
