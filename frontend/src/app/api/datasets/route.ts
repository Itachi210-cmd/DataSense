import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, fileType, rowCount, columnCount } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing required fields (id, name)" },
        { status: 400 }
      );
    }

    const dataset = await prisma.dataset.upsert({
      where: { id },
      update: {
        name,
        fileType: fileType || "csv",
        rowCount: rowCount || 0,
        columnCount: columnCount || 0,
        updatedAt: new Date(),
      },
      create: {
        id,
        name,
        fileType: fileType || "csv",
        rowCount: rowCount || 0,
        columnCount: columnCount || 0,
      },
    });

    return NextResponse.json(dataset, { status: 201 });
  } catch (error: any) {
    console.error("Failed to save dataset in DB:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to persist dataset" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        charts: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json(datasets);
  } catch (error: any) {
    console.error("Failed to fetch datasets:", error);
    return NextResponse.json([], { status: 200 }); // Return empty array on initial empty DB
  }
}
