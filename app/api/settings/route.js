import { NextResponse } from "next/server";
import { getAuth, writeDb } from "@/lib/db";

export const runtime = "nodejs";

const modes = ["direct", "review"];

export async function GET(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ settings: auth.db.settings });
}

export async function PATCH(request) {
  const auth = await getAuth(request);

  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (auth.user.role !== "admin") {
    return NextResponse.json({ message: "Only admin can change settings" }, { status: 403 });
  }

  const body = await request.json();
  const editMode = modes.includes(body.editMode) ? body.editMode : auth.db.settings.editMode;
  const deleteMode = modes.includes(body.deleteMode) ? body.deleteMode : auth.db.settings.deleteMode;

  auth.db.settings = { editMode, deleteMode };
  await writeDb(auth.db);

  return NextResponse.json({ settings: auth.db.settings });
}
