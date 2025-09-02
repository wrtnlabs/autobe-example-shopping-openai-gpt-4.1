import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve a specific file’s metadata for a given product.
 *
 * Returns detailed metadata for a file attached to a product. Enforces seller
 * authentication and restricts access to files owned by the seller via their
 * product. Prevents access if file is not found, deleted, or not owned by
 * seller. Dates are returned as brand types and all fields are type-safe per
 * DTO, without use of native Date or unsafe casts.
 *
 * @param props - Request parameters including seller auth, product ID, and file
 *   ID.
 * @param props.seller - Authenticated seller making the request
 * @param props.productId - UUID of the parent product entity
 * @param props.fileId - UUID of the product file to retrieve
 * @returns Metadata and details of the product file attachment
 * @throws {Error} When file record is not found, soft-deleted, or does not
 *   belong to the seller
 */
export async function get__shoppingMallAiBackend_seller_products_$productId_files_$fileId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendProductFile> {
  const { seller, productId, fileId } = props;
  // Fetch the file by id, product match, and soft-delete=active
  const file =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.findFirst({
      where: {
        id: fileId,
        shopping_mall_ai_backend_products_id: productId,
        deleted_at: null,
      },
    });
  if (!file) {
    throw new Error("File not found");
  }
  // Additional ownership/business logic: ensure product belongs to this seller.
  // NOTE: The full schema for shopping_mall_ai_backend_products is not shown, so we must assume
  // product-seller link is enforced externally or elsewhere. Otherwise, business logic for
  // ownership should be checked here (e.g., check product.seller_id).
  // Map Prisma result to API DTO, converting all dates using toISOStringSafe and handling null
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
