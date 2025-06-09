import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariant";

export async function test_api_productVariants_putById(
  connection: api.IConnection,
) {
  const output: IProductVariant = await api.functional.productVariants.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IProductVariant.IUpdate>(),
    },
  );
  typia.assert(output);
}
