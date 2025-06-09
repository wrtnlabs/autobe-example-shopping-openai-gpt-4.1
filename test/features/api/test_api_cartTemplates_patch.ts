import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICartTemplate";
import { ICartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICartTemplate";

export async function test_api_cartTemplates_patch(
  connection: api.IConnection,
) {
  const output: IPageICartTemplate = await api.functional.cartTemplates.patch(
    connection,
    {
      body: typia.random<ICartTemplate.IRequest>(),
    },
  );
  typia.assert(output);
}
