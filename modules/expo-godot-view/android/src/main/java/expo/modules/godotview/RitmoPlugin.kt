package expo.modules.godotview

import android.app.Activity
import android.content.Intent
import android.util.Log
import org.godotengine.godot.Godot
import org.godotengine.godot.plugin.GodotPlugin
import org.godotengine.godot.plugin.UsedByGodot

/**
 * GodotPlugin that bridges React Native session data to GDScript.
 *
 * Accessible in GDScript via:
 *   var plugin = Engine.get_singleton("RitmoPlugin")
 *
 * Methods available in GDScript:
 *   plugin.getChildName()   -> String  (returns the child's nickname)
 *   plugin.goBack()         -> void    (closes game, result = CANCELED)
 *   plugin.gameCompleted()  -> void    (closes game, result = OK)
 */
class RitmoPlugin(godot: Godot) : GodotPlugin(godot) {

    companion object {
        private const val TAG = "RitmoPlugin"
        /** Set by RitmoGodotActivity before GodotFragment is created */
        var childName: String = "Kid"
        /** Set by EatGodotActivity to "eat" before super.onCreate(); reset to "school" on destroy */
        var gameMode: String = "school"
        /**
         * Incremented every time a new Godot host activity starts.
         * Process kill lambdas capture this value; if a new activity has started
         * (counter changed) before the kill timer fires, the kill is skipped.
         */
        var launchCounter: Int = 0
    }

    override fun getPluginName(): String = "RitmoPlugin"

    /**
     * Returns the child's nickname passed from React Native.
     * GDScript: var name = plugin.getChildName()
     */
    @UsedByGodot
    fun getChildName(): String {
        return childName
    }

    /**
     * Returns the current game mode: "eat" when launched by EatGodotActivity, "school" otherwise.
     * GDScript: var mode = plugin.getGameMode()
     */
    @UsedByGodot
    fun getGameMode(): String {
        return gameMode
    }

    /**
     * Closes the Godot activity and returns RESULT_CANCELED to React Native.
     * Use this for the "Back" button in Godot.
     * GDScript: plugin.goBack()
     */
    @UsedByGodot
    fun goBack() {
        Log.i(TAG, "goBack() requested from Godot")
        val currentActivity = activity
        if (currentActivity is RitmoGodotActivity) {
            currentActivity.markBackExitRequested()
        }
        if (currentActivity is EatGodotActivity) {
            currentActivity.markBackExitRequested()
        }
        if (currentActivity is BrushGodotActivity) {
            currentActivity.markBackExitRequested()
        }
        if (currentActivity is BathGodotActivity) {
            currentActivity.markBackExitRequested()
        }
        if (currentActivity is MakeHairGodotActivity) {
            currentActivity.markBackExitRequested()
        }
        activity?.runOnUiThread {
            finishWithResult(Activity.RESULT_CANCELED)
        }
    }

    /**
     * Closes the Godot activity and returns RESULT_OK to React Native.
     * Use this when the game is completed successfully.
     * GDScript: plugin.gameCompleted()
     */
    @UsedByGodot
    fun gameCompleted() {
        Log.i(TAG, "gameCompleted() requested from Godot")
        // Pre-commit completion synchronously to avoid races where back/cancel wins
        // before runOnUiThread executes.
        val currentActivity = activity
        if (currentActivity is RitmoGodotActivity) {
            currentActivity.preCommitCompletion()
        }
        if (currentActivity is EatGodotActivity) {
            currentActivity.preCommitCompletion()
        }
        if (currentActivity is BrushGodotActivity) {
            currentActivity.preCommitCompletion()
        }
        if (currentActivity is BathGodotActivity) {
            currentActivity.preCommitCompletion()
        }
        if (currentActivity is MakeHairGodotActivity) {
            currentActivity.preCommitCompletion()
        }
        activity?.runOnUiThread {
            finishWithResult(Activity.RESULT_OK)
        }
    }

    private fun finishWithResult(resultCode: Int) {
        val currentActivity = activity ?: return
        if (currentActivity is RitmoGodotActivity) {
            currentActivity.exitGame(resultCode)
            return
        }
        if (currentActivity is EatGodotActivity) {
            currentActivity.exitGame(resultCode)
            return
        }
        if (currentActivity is BrushGodotActivity) {
            currentActivity.exitGame(resultCode)
            return
        }
        if (currentActivity is BathGodotActivity) {
            currentActivity.exitGame(resultCode)
            return
        }
        if (currentActivity is MakeHairGodotActivity) {
            currentActivity.exitGame(resultCode)
            return
        }

        // Fallback host path: persist completion directly when not running in our
        // dedicated activity classes.
        persistCompletionFlag(currentActivity, resultCode == Activity.RESULT_OK)
        val resultIntent = Intent().apply {
            putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
            putExtra("ritmo_result_code", resultCode)
        }
        currentActivity.setResult(resultCode, resultIntent)
        currentActivity.finish()
    }

    private fun persistCompletionFlag(currentActivity: Activity, completed: Boolean) {
        val prefs = currentActivity.getSharedPreferences("ritmo_game", Activity.MODE_PRIVATE)
        // Use synchronous commit because writes come from a separate Godot process.
        val ok = prefs.edit()
            .putBoolean("godot_game_completed", completed)
            .putLong("godot_game_completed_at", System.currentTimeMillis())
            .commit()
        Log.i(TAG, "persistCompletionFlag(completed=$completed, committed=$ok)")
    }
}
