import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariant";

export async function test_api_productVariants_post(
  connection: api.IConnection,
) {
  const output: IProductVariant = await api.functional.productVariants.post(
    connection,
    {
      body: typia.random<IProductVariant.ICreate>(),
    },
  );
  typia.assert(output);
}
