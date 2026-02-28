import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/auth-helpers";
import { getAccessToken, listProjects } from "@/lib/asana";
import { z } from "zod";

// GET — connection status + projects
export async function GET() {
  try {
    const user = await requireFeature("asana_sync");

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        asanaConnectedAt: true,
        asanaWorkspaceGid: true,
        asanaWorkspaceName: true,
        asanaProjectGid: true,
        asanaProjectName: true,
        asanaAutoCreateTasks: true,
      },
    });

    if (!dbUser?.asanaConnectedAt) {
      return NextResponse.json({ connected: false });
    }

    // Fetch projects from the workspace
    let projects: { gid: string; name: string }[] = [];
    if (dbUser.asanaWorkspaceGid) {
      try {
        const accessToken = await getAccessToken(user.id);
        projects = await listProjects(accessToken, dbUser.asanaWorkspaceGid);
      } catch {
        // Token may have expired — still show connected status
      }
    }

    return NextResponse.json({
      connected: true,
      connectedAt: dbUser.asanaConnectedAt,
      workspaceGid: dbUser.asanaWorkspaceGid,
      workspaceName: dbUser.asanaWorkspaceName,
      projectGid: dbUser.asanaProjectGid,
      projectName: dbUser.asanaProjectName,
      autoCreateTasks: dbUser.asanaAutoCreateTasks,
      projects,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Asana status error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}

// PUT — update project selection / auto-create toggle
const updateSchema = z.object({
  projectGid: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  autoCreateTasks: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await requireFeature("asana_sync");

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.projectGid !== undefined) data.asanaProjectGid = parsed.data.projectGid;
    if (parsed.data.projectName !== undefined) data.asanaProjectName = parsed.data.projectName;
    if (parsed.data.autoCreateTasks !== undefined) data.asanaAutoCreateTasks = parsed.data.autoCreateTasks;

    await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ message: "Settings updated" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Asana settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
