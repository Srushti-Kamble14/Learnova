import { connectDb } from "@/lib/mongodb";
import { verifyFirebaseToken } from "@/lib/firebase-admin";
import { ObjectId } from "mongodb";

export async function PUT(request) {
  try {
    // Get the authorization header
    const authorization = request.headers.get("authorization");
    const token = authorization?.split(" ")[1];

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { exceptionId, status, comments } = body;

    // Connect to database
    const db = await connectDb();

    const result = await db.collection("exceptions").updateOne(
      { _id: new ObjectId(exceptionId) },
      {
        $set: {
          status,
          comments,
          reviewedBy: decodedToken.email,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return Response.json({ message: "Exception not found" }, { status: 404 });
    }

    return Response.json(
      { message: "Exception updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Exception update error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
