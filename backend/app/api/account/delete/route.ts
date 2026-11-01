import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId, unauthorized } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { usersCollection } from "@/lib/users";
import { takeAttempt, clientIp, tooManyAttempts } from "@/lib/rateLimit";

const MAX_ACCOUNT_DELETION_ATTEMPTS = 5;
const ACCOUNT_DELETION_WINDOW_SECONDS = 15 * 60; // 15 minutes

export async function DELETE(req: NextRequest) {
  // Rate limit: 5 attempts per 15 minutes per IP
  const result = await takeAttempt(
    `account-deletion:${clientIp(req)}`,
    MAX_ACCOUNT_DELETION_ATTEMPTS,
    ACCOUNT_DELETION_WINDOW_SECONDS
  );
  if (!result.allowed) {
    return tooManyAttempts(result.retryAfterSeconds);
  }

  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  // Parse the userId from the query param
  const url = new URL(req.url);
  const targetId = url.searchParams.get("userId");

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json(
      { error: "userId query parameter is required" },
      { status: 400 }
    );
  }

  // Ownership check: user can only delete their own account
  if (userId !== targetId) {
    return NextResponse.json(
      { error: "You can only delete your own account" },
      { status: 403 }
    );
  }

  try {
    // Delete all user-owned resources
    const userObj = new ObjectId(userId);

    // Delete tasks
    const tasksCol = (await getDb()).collection("tasks");
    await tasksCol.deleteMany({ userId: userObj });

    // Delete boards
    const boardsCol = (await getDb()).collection("boards");
    await boardsCol.deleteMany({ userId: userObj });

    // Delete notes
    const notesCol = (await getDb()).collection("notes");
    await notesCol.deleteMany({ userId: userObj });

    // Delete note deletions
    const noteDeletionsCol = (await getDb()).collection("noteDeletions");
    await noteDeletionsCol.deleteMany({ userId: userObj });

    // Delete notifications
    const notificationsCol = (await getDb()).collection("notifications");
    await notificationsCol.deleteMany({ userId: userObj });

    // Delete friends (as both requester and recipient)
    const friendsCol = (await getDb()).collection("friends");
    await friendsCol.deleteMany({
      $or: [{ requesterId: userObj }, { recipientId: userObj }],
    });

    // Delete shares (as owner and friend)
    const sharesCol = (await getDb()).collection("shares");
    await sharesCol.deleteMany({
      $or: [{ ownerId: userObj }, { friendId: userObj }],
    });

    // Delete the user
    const usersCol = await usersCollection();
    await usersCol.deleteOne({ _id: userObj });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Account deletion failed:", err);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again later." },
      { status: 500 }
    );
  }
}

// Re-import getDb since it's needed for collection access
import { getDb } from "@/lib/mongodb";
