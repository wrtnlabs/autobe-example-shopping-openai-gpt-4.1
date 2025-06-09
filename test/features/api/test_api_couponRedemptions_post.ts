import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/ICouponRedemption";

export async function test_api_couponRedemptions_post(
  connection: api.IConnection,
) {
  const output: ICouponRedemption = await api.functional.couponRedemptions.post(
    connection,
    {
      body: typia.random<ICouponRedemption.ICreate>(),
    },
  );
  typia.assert(output);
}
