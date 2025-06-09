import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISection";
import { ISection } from "@ORGANIZATION/PROJECT-api/lib/structures/ISection";

export async function test_api_sections_patch(connection: api.IConnection) {
  const output: IPageISection = await api.functional.sections.patch(
    connection,
    {
      body: typia.random<ISection.IRequest>(),
    },
  );
  typia.assert(output);
}
