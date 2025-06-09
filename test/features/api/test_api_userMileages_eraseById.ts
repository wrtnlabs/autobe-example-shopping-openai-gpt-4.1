import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserMileage";

export async function test_api_userMileages_eraseById(
  connection: api.IConnection,
) {
  const output: IUserMileage = await api.functional.userMileages.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
