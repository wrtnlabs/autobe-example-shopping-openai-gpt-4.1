import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductVariant";
import { IProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariant";

export async function test_api_productVariants_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductVariant =
    await api.functional.productVariants.patch(connection, {
      body: typia.random<IProductVariant.IRequest>(),
    });
  typia.assert(output);
}
