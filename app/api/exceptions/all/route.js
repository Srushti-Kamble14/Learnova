import { connectDb } from "@/lib/mongodb";
import { verifyFirebaseToken } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    // Get the authorization header
    const authorization = request.headers.get("authorization");
    const token = authorization?.split(" ")[1];

    // Verify Firebase token
    const decodedToken = await verifyFirebaseToken(token);

    if (!decodedToken) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    const db = await connectDb();

    // Fetch all exception requests, sorted by creation date (newest first)
    const exceptions = await db
      .collection("exceptions")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return Response.json({ exceptions }, { status: 200 });
  } catch (error) {
    console.error("Exception fetch error:", error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
