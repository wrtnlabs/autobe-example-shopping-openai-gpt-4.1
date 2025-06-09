import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserMileage";
import { IUserMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserMileage";

export async function test_api_userMileages_patch(connection: api.IConnection) {
  const output: IPageIUserMileage = await api.functional.userMileages.patch(
    connection,
    {
      body: typia.random<IUserMileage.IRequest>(),
    },
  );
  typia.assert(output);
}
