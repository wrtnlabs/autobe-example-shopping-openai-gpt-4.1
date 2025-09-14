import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Retrieve details of a specific section binding for a product
 * (ai_commerce_product_section_bindings).
 *
 * Retrieves the full detail of a product-section binding by bindingId and
 * productId, enforcing that only the owner seller can access their product's
 * section bindings. Used for business monitoring and display troubleshooting.
 *
 * Authorization: Only the seller who owns the product may retrieve the binding
 * detail. If the binding or product does not exist or does not belong to the
 * seller, throws an error.
 *
 * @param props - Parameters for the query
 * @param props.seller - Authenticated seller, must own the product
 * @param props.productId - UUID of the product for which to retrieve the
 *   section binding
 * @param props.bindingId - UUID of the section binding to retrieve
 * @returns Section binding detail object
 * @throws {Error} If the binding is not found, not for the given product, or
 *   not owned by the seller
 */
export async function getaiCommerceSellerProductsProductIdSectionBindingsBindingId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductSectionBinding> {
  const { seller, productId, bindingId } = props;

  const binding =
    await MyGlobal.prisma.ai_commerce_product_section_bindings.findFirst({
      where: {
        id: bindingId,
        product_id: productId,
        product: {
          seller_id: seller.id,
        },
      },
    });

  if (!binding) {
    throw new Error("Section binding not found");
  }

  return {
    id: binding.id,
    product_id: binding.product_id,
    section_id: binding.section_id,
    display_order: binding.display_order,
  };
}
