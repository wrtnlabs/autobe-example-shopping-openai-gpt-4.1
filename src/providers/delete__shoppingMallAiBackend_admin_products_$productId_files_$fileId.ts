import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Logically delete (soft delete) a product file from a product’s attachments.
 *
 * Performs a logical (soft) deletion of a product file, marking it as deleted
 * by setting the deleted_at timestamp. The file remains available for
 * compliance review but is excluded from normal product displays and listings.
 * Typical use cases include removing outdated images, correcting misfiled
 * assets, or compliance-driven takedowns. Logical deletion ensures full audit
 * trails and supports restoration under administrative workflows. Access is
 * restricted to product owners (sellers) or administrators. Attempts to delete
 * already deleted or non-existent files trigger error responses. Closely
 * related to file creation and update endpoints as part of full asset lifecycle
 * management.
 *
 * @param props - Request properties
 * @param props.admin - Admin authentication payload (must be active admin)
 * @param props.productId - UUID for the parent product entity
 * @param props.fileId - Unique identifier for the file attachment to be
 *   logically deleted
 * @returns Void (operation completes on success, throws error on failure)
 * @throws {Error} When file does not exist for this product or is already soft
 *   deleted
 */
export async function delete__shoppingMallAiBackend_admin_products_$productId_files_$fileId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, productId, fileId } = props;

  // 1. Locate file (must match both fileId and productId)
  const productFile =
    await MyGlobal.prisma.shopping_mall_ai_backend_product_files.findFirst({
      where: {
        id: fileId,
        shopping_mall_ai_backend_products_id: productId,
      },
    });
  if (!productFile) {
    throw new Error(
      "File not found for the given product. Soft deletion failed.",
    );
  }
  if (productFile.deleted_at) {
    throw new Error("Product file already deleted. Cannot soft delete twice.");
  }

  // 2. Soft-delete: set deleted_at to now (ISO string, never native Date)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.shopping_mall_ai_backend_product_files.update({
    where: { id: fileId },
    data: { deleted_at: deletedAt },
  });
  // 3. No output (void)
}
