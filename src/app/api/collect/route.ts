import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "jobs_temp.json");

function getJobs() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  const data = fs.readFileSync(DATA_FILE, "utf-8");

  if (!data.trim()) {
    return [];
  }

  return JSON.parse(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const jobs = getJobs();

    const newJob = {
      id: crypto.randomUUID(),
      title: body.title || "Untitled",
      url: body.url || "",
      rawText: body.rawText || "",
      collectedAt: new Date().toISOString(),
    };

    jobs.unshift(newJob);

    fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      job: newJob,
    });
  } catch (error) {
    console.error("Collect API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
