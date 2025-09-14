import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Erase a product-tag binding (ai_commerce_product_tags).
 *
 * This endpoint deletes the association between a product and a tag in the
 * ai_commerce_product_tags table. This operation is irreversible; the binding
 * is removed permanently, affecting product search and platform discovery. Only
 * administrators have permission to perform this operation. If the productTagId
 * does not exist, an error is thrown.
 *
 * @param props - The request parameters
 * @param props.admin - The authenticated administrator performing the deletion
 * @param props.productTagId - The unique ID of the product-tag binding to
 *   delete
 * @returns Void
 * @throws {Error} If the binding does not exist or has already been deleted
 */
export async function deleteaiCommerceAdminProductTagsProductTagId(props: {
  admin: AdminPayload;
  productTagId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.ai_commerce_product_tags.delete({
    where: { id: props.productTagId },
  });
}
