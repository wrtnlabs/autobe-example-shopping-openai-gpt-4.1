import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve details of a specific section binding for a product
 * (ai_commerce_product_section_bindings).
 *
 * This endpoint fetches the full detail of a single binding entry between a
 * product and a merchandising section, as needed for business monitoring,
 * troubleshooting, or confirming merchandising setup. Only administrators may
 * access this endpoint.
 *
 * @param props - Request parameters
 * @param props.admin - System administrator authentication payload. Required
 *   for authorization.
 * @param props.productId - UUID of the product whose binding relationship is
 *   being queried.
 * @param props.bindingId - UUID of the specific section binding to retrieve.
 * @returns Returns all metadata for the section binding, including id,
 *   product_id, section_id, and display_order.
 * @throws {Error} If the binding with given IDs does not exist or is not
 *   associated with the provided product.
 */
export async function getaiCommerceAdminProductsProductIdSectionBindingsBindingId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductSectionBinding> {
  const { productId, bindingId } = props;
  const binding =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findFirst({
      where: {
        id: bindingId,
        product_id: productId,
      },
      select: {
        id: true,
        product_id: true,
        section_id: true,
        display_order: true,
      },
    });
  if (!binding) {
    throw new Error("Binding not found");
  }
  return {
    id: binding.id,
    product_id: binding.product_id,
    section_id: binding.section_id,
    display_order: binding.display_order,
  };
}
