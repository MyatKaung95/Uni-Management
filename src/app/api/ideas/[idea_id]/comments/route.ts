import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getDataFromToken } from "@/helpers/getDataFromToken";
import { sendEmail } from "@/helpers/comment";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const ideaId = request.url.split("/")[5];
    const userId = await getDataFromToken(request);
    const reqBody = await request.json();
    const { text } = reqBody;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Check if the user is banned
    if (user?.isBanned) {
      return NextResponse.json({
        message: "This account is banned from posting ideas and comments",
      });
    }

    const newComment = await prisma.comment.create({
      data: {
        text,
        ideaId,
        userId,
      },
    });

    console.log(newComment);

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    const author = await prisma.user.findUnique({
      where: { id: idea?.authorId },
    });
    const commenter = await prisma.user.findUnique({ where: { id: userId } });
    const email = author?.email;
    const username = commenter?.name;

    await sendEmail({ email, username });

    return NextResponse.json({
      message: "Comment created successfully",
      newComment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const comments = await prisma.comment.findMany({
    where: { isHidden: false },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json({ comments });
}
