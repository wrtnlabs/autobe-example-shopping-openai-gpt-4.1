import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Updates metadata of a file attached to a product (e.g., display order,
 * is_primary).
 *
 * Permits authorized sellers or admins to update the metadata (such as display
 * order, is_primary, or file type) of a file attached to a specific product.
 * All updates are validated for business logic, such as ensuring only one
 * primary image per product (per product), and correct product association.
 * This operation is commonly used to change file order, correct mistake file
 * types, or feature a particular image. Audit trails capture all changes for
 * compliance. Related endpoints include file listing, detail view, and file
 * deletion. Note that ownership of product by seller cannot be enforced in this
 * schema (no seller link present), so business check must be handled at
 * creation time or in policy.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller making the request
 * @param props.productId - UUID of the product whose file is being updated
 * @param props.fileId - UUID of the product file being updated
 * @param props.body - Update metadata for the file (display_order, is_primary,
 *   file_type, etc.)
 * @returns The updated product file entity, with all date fields formatted
 *   correctly (ISO 8601)
 * @throws {Error} When the file does not exist, does not belong to the
 *   specified product, or business logic violated
 */
export async function put__shoppingMallAiBackend_seller_products_$productId_files_$fileId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductFile.IUpdate;
}): Promise<IShoppingMallAiBackendProductFile> {
  const { seller, productId, fileId, body } = props;
  // 1. Find file and ensure it belongs to product
  const file =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.findUnique({
      where: { id: fileId },
    });
  if (!file || file.shopping_mall_ai_backend_products_id !== productId) {
    throw new Error("File not found or does not belong to specified product.");
  }
  // 2. Ensure is_primary uniqueness enforcement
  if (body.is_primary) {
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.updateMany({
      where: {
        shopping_mall_ai_backend_products_id: productId,
        is_primary: true,
        id: { not: fileId },
      },
      data: { is_primary: false },
    });
  }
  // 3. Update the file with provided fields
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
  // 4. DTO return (ensure date string conversion)
  return {
    id: updated.id,
    shopping_mall_ai_backend_products_id:
      updated.shopping_mall_ai_backend_products_id,
    file_uri: updated.file_uri,
    file_type: updated.file_type,
    display_order: updated.display_order,
    is_primary: updated.is_primary,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
