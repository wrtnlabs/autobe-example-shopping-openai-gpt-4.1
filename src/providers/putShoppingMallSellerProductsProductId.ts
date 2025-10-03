import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // 1. Authorization: product must exist for this seller, not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Product not found or not owned by this seller",
      403,
    );
  }

  // 2. Update fields (only updatable) + touch updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_products.update({
    where: { id: props.productId },
    data: {
      shopping_mall_channel_id:
        props.body.shopping_mall_channel_id ?? undefined,
      shopping_mall_section_id:
        props.body.shopping_mall_section_id ?? undefined,
      shopping_mall_category_id:
        props.body.shopping_mall_category_id ?? undefined,
      code: props.body.code ?? undefined,
      name: props.body.name ?? undefined,
      status: props.body.status ?? undefined,
      business_status: props.body.business_status ?? undefined,
      updated_at: now,
    },
  });

  // 3. Snapshot: get latest version and increment, create snapshot
  const maxVersionRow =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirst({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { snapshot_version: "desc" },
      select: { snapshot_version: true },
    });
  const newVersion = (maxVersionRow?.snapshot_version ?? 0) + 1;
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      snapshot_version: newVersion,
      data_json: JSON.stringify(updated),
      created_at: now,
    },
  });

  // 4. Return updated product, mapped to IShoppingMallProduct
  return {
    id: updated.id,
    shopping_mall_seller_id: updated.shopping_mall_seller_id,
    shopping_mall_channel_id: updated.shopping_mall_channel_id,
    shopping_mall_section_id: updated.shopping_mall_section_id,
    shopping_mall_category_id: updated.shopping_mall_category_id,
    code: updated.code,
    name: updated.name,
    status: updated.status,
    business_status: updated.business_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
