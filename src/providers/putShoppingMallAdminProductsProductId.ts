import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found or has been deleted", 404);
  }

  if (props.body.code !== undefined) {
    const codeDupe = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        code: props.body.code,
        id: { not: props.productId },
      },
    });
    if (codeDupe) {
      throw new HttpException("Duplicate product code", 409);
    }
  }
  if (props.body.name !== undefined) {
    const nameDupe = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.productId },
      },
    });
    if (nameDupe) {
      throw new HttpException("Duplicate product name", 409);
    }
  }

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

  const lastSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirst({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { snapshot_version: "desc" },
    });
  const nextSnapshotVersion = lastSnapshot
    ? lastSnapshot.snapshot_version + 1
    : 1;
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: updated.id,
      snapshot_version: nextSnapshotVersion,
      data_json: JSON.stringify({
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
        updated_at: toISOStringSafe(updated.updated_at),
        deleted_at:
          updated.deleted_at !== null && updated.deleted_at !== undefined
            ? toISOStringSafe(updated.deleted_at)
            : undefined,
      }),
      created_at: now,
    },
  });

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
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
