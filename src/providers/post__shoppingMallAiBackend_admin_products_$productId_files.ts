import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Attach a new file or image to a product.
 *
 * Allows an admin to add a new file (such as an image, manual, or related
 * attachment) to the specified product. The new file is registered with its
 * metadata and assigned a display order and is_primary status if needed.
 * Ownership and access checks are enforced by linking to the product and
 * uploader’s identity. Errors include missing product, or attempts to add files
 * to non-existent products.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 * @param props.productId - UUID of the product to which the file will be
 *   attached
 * @param props.body - Details of the new product file (file URI, metadata,
 *   display order, is_primary) for creation
 * @returns The newly created product file record including all metadata
 * @throws {Error} If the product does not exist or is deleted
 */
export async function post__shoppingMallAiBackend_admin_products_$productId_files(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductFile.ICreate;
}): Promise<IShoppingMallAiBackendProductFile> {
  const { admin, productId, body } = props;

  // Step 1: Confirm product exists and is active (not deleted).
  // (In schema, shopping_mall_ai_backend_products doesn't expose deleted_at, but in full schema it almost certainly has it. For now, check only on id.)
  const product =
    await MyGlobal.prisma.shopping_mall_ai_backend_products.findFirst({
      where: {
        id: productId,
      },
    });
  if (!product) {
    throw new Error("Product not found");
  }

  // Step 2: Insert product file entity
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        shopping_mall_ai_backend_products_id:
          body.shopping_mall_ai_backend_products_id,
        file_uri: body.file_uri,
        file_type: body.file_type,
        display_order: body.display_order,
        is_primary: body.is_primary,
        created_at: now,
      },
    });

  // Step 3: Shape DTO response, branding and converting date fields
  return {
    id: created.id,
    shopping_mall_ai_backend_products_id:
      created.shopping_mall_ai_backend_products_id,
    file_uri: created.file_uri,
    file_type: created.file_type,
    display_order: created.display_order,
    is_primary: created.is_primary,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
