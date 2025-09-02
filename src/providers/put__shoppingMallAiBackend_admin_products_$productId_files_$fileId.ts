import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update metadata of a file attached to a product (e.g., display order,
 * is_primary).
 *
 * Permits authorized admins to update the metadata (display order, is_primary,
 * file_type, etc.) of a file attached to a specific product. Ensures business
 * logic: only one file per product is primary, validates the file belongs to
 * the target product, and enforces active (non-deleted) records. All update
 * fields are applied functionally; date fields are handled as ISO strings with
 * proper branding.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload
 * @param props.productId - UUID of the product associated with the file
 * @param props.fileId - UUID of the file to update
 * @param props.body - New file metadata for update (display_order, is_primary,
 *   etc.)
 * @returns The updated product file entity with all metadata fields populated
 * @throws {Error} When file is not found or not active for the given product
 */
export async function put__shoppingMallAiBackend_admin_products_$productId_files_$fileId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductFile.IUpdate;
}): Promise<IShoppingMallAiBackendProductFile> {
  const { admin, productId, fileId, body } = props;

  // 1. Fetch target file for the given product and ensure record is active (not deleted)
  const file =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.findFirst({
      where: {
        id: fileId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!file) throw new Error("File not found");

  // 2. If body.is_primary true, unset all others as primary for this product (business rule: one primary)
  if (body.is_primary === true) {
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.updateMany({
      where: {
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
      data: {
        is_primary: false,
      },
    });
  }

  // 3. Update only fields explicitly provided
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.update({
      where: { id: fileId },
      data: {
        file_uri: body.file_uri ?? undefined,
        file_type: body.file_type ?? undefined,
        display_order: body.display_order ?? undefined,
        is_primary: body.is_primary ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
      },
    });

  // 4. Map all output fields, converting dates to string brand types
  return {
    id: updated.id,
    shopping_mall_ai_backend_products_id:
      updated.shopping_mall_ai_backend_products_id,
    file_uri: updated.file_uri,
    file_type: updated.file_type,
    display_order: updated.display_order,
    is_primary: updated.is_primary,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
