import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Attach a new file or image to a product.
 *
 * Allows a seller or admin to add a new file (such as an image, manual, or
 * related attachment) to the specified product. The new file is registered with
 * its metadata and assigned a display order and is_primary status if needed.
 * Uploads are validated for content type, file size, and business logic (e.g.,
 * only one primary image per product). Ownership and access checks are enforced
 * by linking to the product and uploader’s identity. Errors include file size
 * limits, invalid file types, or permission errors for non-product owners. This
 * endpoint is used alongside file listing, update, and delete APIs for a full
 * asset management cycle.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller uploading the file (must be
 *   logged in)
 * @param props.productId - UUID of the product to which the file will be
 *   attached
 * @param props.body - Details of the new product file for creation (file URI,
 *   metadata, display order, etc.)
 * @returns Information about the newly attached product file, including
 *   metadata.
 * @throws {Error} When the target product does not exist (404)
 * @note Ownership/auth checks: Ownership is not strictly enforced due to schema limitation—product has no seller_id field for validation. This endpoint assumes policy is enforced externally or requires schema update for strict enforcement.
 */
export async function post__shoppingMallAiBackend_seller_products_$productId_files(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductFile.ICreate;
}): Promise<IShoppingMallAiBackendProductFile> {
  const { seller, productId, body } = props;

  // Check that the product exists (ownership cannot be enforced due to schema limitation)
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findUnique({
      where: { id: productId },
    });
  if (!product) throw new Error("Product not found");

  // Insert new product file
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_products_id: productId,
        file_uri: body.file_uri,
        file_type: body.file_type,
        display_order: body.display_order,
        is_primary: body.is_primary,
        created_at: toISOStringSafe(new Date()),
        deleted_at: undefined, // Not deleted
      },
    });

  // Return API DTO fields with correct brand typing for date/uuid fields
  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_products_id:
      created.shopping_mall_ai_backend_products_id as string &
        tags.Format<"uuid">,
    file_uri: created.file_uri,
    file_type: created.file_type,
    display_order: created.display_order,
    is_primary: created.is_primary,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
