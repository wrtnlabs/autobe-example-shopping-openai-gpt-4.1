import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves detailed metadata for a single file attached to a product.
 *
 * Fetches properties such as URI, content type, display order, and primary
 * status, and enforces admin authorization. Results are used for asset
 * management, product detail displays, compliance verification, or AI-powered
 * analysis. Checks both correct file ownership and logical deletion status.
 * Throws an error if the file is not found, is not attached to the specified
 * product, or is logically deleted.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload
 * @param props.productId - UUID of the parent product entity
 * @param props.fileId - Unique identifier of the file to retrieve
 * @returns Complete information and metadata of the specific file for the
 *   product
 * @throws {Error} When file is not found, not attached to the provided product,
 *   or access is denied
 */
export async function get__shoppingMallAiBackend_admin_products_$productId_files_$fileId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductFile> {
  const { admin, productId, fileId } = props;

  // Authorization is enforced by controller/decorator, but double-check admin ID (fail-fast if admin not found)
  // (Optional: Can skip explicit DB check if decorator covers active status)

  // Query for the file attached to the specified product, not logically deleted
  const file =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.findFirst({
      where: {
        id: fileId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!file) {
    throw new Error("File not found or access denied");
  }

  // Map database record to API structure, converting dates to ISO string
  return {
    id: file.id,
    shopping_mall_ai_backend_products_id:
      file.shopping_mall_ai_backend_products_id,
    file_uri: file.file_uri,
    file_type: file.file_type,
    display_order: file.display_order,
    is_primary: file.is_primary,
    created_at: toISOStringSafe(file.created_at),
    deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
  };
}
