import { NextRequest, NextResponse } from "next/server";
import { rooms } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const roomId = params.id;
  const room = rooms.get(roomId);
  
  if (!room) {
    return NextResponse.json(
      { error: "Room not found" },
      { status: 404 }
    );
  }
  
  return NextResponse.json(room);
}