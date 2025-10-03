import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdPaymentsPaymentIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentSnapshot> {
  const { orderId, paymentId, snapshotId } = props;
  // 1) Find the payment snapshot.
  const snapshot =
    await MyGlobal.prisma.shopping_mall_payment_snapshots.findUnique({
      where: { id: snapshotId },
    });
  if (!snapshot) {
    throw new HttpException("Payment snapshot not found", 404);
  }
  // 2) Check that the snapshot belongs to the requested paymentId.
  if (snapshot.shopping_mall_payment_id !== paymentId) {
    throw new HttpException(
      "Snapshot does not belong to specified payment",
      404,
    );
  }
  // 3) Check the payment belongs to the requested orderId.
  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: paymentId },
  });
  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }
  if (payment.shopping_mall_order_id !== orderId) {
    throw new HttpException("Payment does not belong to specified order", 404);
  }
  // 4) Return result as IShoppingMallPaymentSnapshot, ensuring correct field names and conversions
  return {
    id: snapshot.id,
    shopping_mall_payment_id: snapshot.shopping_mall_payment_id,
    snapshot_data: snapshot.snapshot_data,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
