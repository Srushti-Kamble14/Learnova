import { jsonSuccess, jsonError } from "@/lib/api-response";
import { withErrorHandler, authenticateRequest } from "@/lib/error-handler";
import { initializeFirebase } from "@/lib/firebase-admin";
import admin from "firebase-admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-side cleanup endpoint for orphaned Firebase Auth accounts.
 * This endpoint uses the Firebase Admin SDK to delete auth accounts
 * that cannot be deleted client-side due to re-authentication requirements.
 * 
 * Called when client-side profile creation fails and the auth account
 * needs to be cleaned up to prevent orphaned accounts.
 */
export const POST = withErrorHandler(async (request) => {
  const user = await authenticateRequest(request);

  const body = await request.json();
  const { uid } = body;

  if (!uid || typeof uid !== "string") {
    return jsonError("Invalid or missing UID parameter", 400);
  }

  // Ensure user is authorized to delete the account
  if (user.uid !== uid) {
    return jsonError("Forbidden: Cannot delete another user's account", 403);
  }

  try {
    initializeFirebase();
    
    logger.info(`[auth-cleanup] Attempting to delete orphaned account: ${uid}`);
    
    // Delete the user from Firebase Auth using Admin SDK
    // This bypasses the re-authentication requirement
    await admin.auth().deleteUser(uid);
    
    logger.info(`[auth-cleanup] Successfully deleted orphaned account: ${uid}`);
    
    return jsonSuccess({ 
      message: "Orphaned auth account deleted successfully",
      uid 
    });
  } catch (error) {
    // Don't throw if user doesn't exist - they may have been already cleaned up
    if (error.code === "auth/user-not-found") {
      logger.warn(`[auth-cleanup] User ${uid} not found - may have been already cleaned up`);
      return jsonSuccess({ 
        message: "User already deleted or not found",
        uid 
      });
    }

    logger.error(`[auth-cleanup] Failed to delete orphaned account ${uid}: ${error.message}`);
    
    // Log for manual cleanup but don't expose internal error details
    return jsonError("Failed to cleanup orphaned account. Please contact support.", 500);
  }
});
