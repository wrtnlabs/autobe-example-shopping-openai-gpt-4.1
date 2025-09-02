import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Soft delete (logical removal) of a customer's favorite folder by marking
 * deleted_at.
 *
 * This function enables an authenticated customer to logically delete their own
 * favorite folder in the shopping_mall_ai_backend_favorite_folders table, by
 * setting its deleted_at timestamp. The operation is idempotent: if the folder
 * is already deleted or does not belong to the customer, it returns silently
 * without error. Ownership and not-already-deleted status are enforced.
 *
 * @param props - The function parameters
 * @param props.customer - The authenticated customer payload (must be the
 *   folder owner)
 * @param props.favoriteFolderId - The unique UUID of the favorite folder to
 *   soft-delete
 * @returns Void (the operation is idempotent and always succeeds unless
 *   database errors occur)
 * @throws {Error} If a database error occurs
 */
export async function delete__shoppingMallAiBackend_customer_favoriteFolders_$favoriteFolderId(props: {
  customer: CustomerPayload;
  favoriteFolderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, favoriteFolderId } = props;
  // Query for folder owned by user, omit if already deleted
  const folder =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.findFirst({
      where: {
        id: favoriteFolderId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!folder) {
    // Idempotent: already deleted or not owned by this user, exit
    return;
  }
  await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.update({
    where: { id: favoriteFolderId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
