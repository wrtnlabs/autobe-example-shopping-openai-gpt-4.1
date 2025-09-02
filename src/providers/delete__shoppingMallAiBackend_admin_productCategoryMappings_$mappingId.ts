import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Permanently deletes a product-category mapping from the commerce catalog.
 *
 * This operation allows an authorized admin to permanently remove a mapping
 * between a product and a category. Hard delete only: the record is physically
 * removed from the database, not soft-deleted. Used to correct catalog
 * structures, remove deprecated categories, or reclassify products.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 *   (authorization enforced)
 * @param props.mappingId - The unique identifier of the mapping to delete
 *   (UUID)
 * @returns Void
 * @throws {Error} If the mapping does not exist
 */
export async function delete__shoppingMallAiBackend_admin_productCategoryMappings_$mappingId(props: {
  admin: AdminPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { mappingId } = props;
  await MyGlobal.prisma.shopping_mall_ai_backend_product_category_mappings.delete(
    {
      where: { id: mappingId },
    },
  );
}
