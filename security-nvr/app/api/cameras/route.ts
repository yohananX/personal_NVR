import { NextResponse } from "next/server";

const cameras = [
  {
    id: 1,
    name: "STAIRS 1",
    path: "stairs1",
  },
  {
    id: 2,
    name: "CORRIDOR 2",
    path: "corridor2",
  },
];

export async function GET() {
  return NextResponse.json(cameras);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (
    typeof body.name !== "string" || typeof body.path !== "string" || body.name.trim() === "" || body.path.trim() === ""){
      return NextResponse.json(
        {error: "Name and path are required"},
        {status: 400}
      )
    }


  const camera = {
    id: cameras.length + 1,
    name: body.name,
    path: body.path,
  };

  cameras.push(camera);

  return NextResponse.json(camera, { status: 201 });
}