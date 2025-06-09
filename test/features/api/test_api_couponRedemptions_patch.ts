import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICouponRedemption";
import { ICouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/ICouponRedemption";

export async function test_api_couponRedemptions_patch(
  connection: api.IConnection,
) {
  const output: IPageICouponRedemption =
    await api.functional.couponRedemptions.patch(connection, {
      body: typia.random<ICouponRedemption.IRequest>(),
    });
  typia.assert(output);
}
