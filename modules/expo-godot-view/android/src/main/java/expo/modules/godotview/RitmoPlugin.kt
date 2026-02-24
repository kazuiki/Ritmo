package expo.modules.godotview

import android.app.Activity
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
        /** Set by RitmoGodotActivity before GodotFragment is created */
        var childName: String = "Kid"
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
     * Closes the Godot activity and returns RESULT_CANCELED to React Native.
     * Use this for the "Back" button in Godot.
     * GDScript: plugin.goBack()
     */
    @UsedByGodot
    fun goBack() {
        activity?.runOnUiThread {
            val currentActivity = activity
            if (currentActivity is RitmoGodotActivity) {
                currentActivity.exitGame(Activity.RESULT_CANCELED)
            } else {
                currentActivity?.setResult(Activity.RESULT_CANCELED)
                currentActivity?.finish()
            }
        }
    }

    /**
     * Closes the Godot activity and returns RESULT_OK to React Native.
     * Use this when the game is completed successfully.
     * GDScript: plugin.gameCompleted()
     */
    @UsedByGodot
    fun gameCompleted() {
        activity?.runOnUiThread {
            val currentActivity = activity
            if (currentActivity is RitmoGodotActivity) {
                currentActivity.exitGame(Activity.RESULT_OK)
            } else {
                currentActivity?.setResult(Activity.RESULT_OK)
                currentActivity?.finish()
            }
        }
    }
}
