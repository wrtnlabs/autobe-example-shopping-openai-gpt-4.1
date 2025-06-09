import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductOption";
import { IProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductOption";

export async function test_api_productOptions_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductOption = await api.functional.productOptions.patch(
    connection,
    {
      body: typia.random<IProductOption.IRequest>(),
    },
  );
  typia.assert(output);
}
