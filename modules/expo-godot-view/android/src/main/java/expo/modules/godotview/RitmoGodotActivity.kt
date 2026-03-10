package expo.modules.godotview

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Process
import org.godotengine.godot.Godot
import org.godotengine.godot.GodotActivity
import org.godotengine.godot.plugin.GodotPlugin

/**
 * Activity that hosts the Godot game engine.
 * Receives child_name via Intent extras and makes it available to GDScript
 * through the RitmoPlugin singleton.
 *
 * Launch from React Native via IntentLauncher:
 *   className: 'expo.modules.godotview.RitmoGodotActivity'
 *
 * Result codes:
 *   RESULT_CANCELED (0) = back button / exited early
 *   RESULT_OK (-1)      = game completed successfully
 */
class RitmoGodotActivity : GodotActivity() {

    private var exitResultCode = Activity.RESULT_CANCELED
    private var exitRequested = false
    private var processResetScheduled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setResult(Activity.RESULT_CANCELED)
        updateChildName(intent)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        updateChildName(intent)
    }

    override fun onDestroy() {
        RitmoPlugin.childName = "Kid"
        super.onDestroy()
    }

    override fun onBackPressed() {
        exitGame(Activity.RESULT_CANCELED)
    }

    override fun getHostPlugins(godot: Godot): MutableSet<GodotPlugin> {
        return mutableSetOf(RitmoPlugin(godot))
    }

    override fun onGodotForceQuit(instance: Godot) {
        runOnUiThread {
            if (exitRequested) {
                exitGame(exitResultCode)
            }
        }
    }

    override fun onGodotRestartRequested(instance: Godot) {
        runOnUiThread {
            if (exitRequested) {
                exitGame(exitResultCode)
            }
        }
    }

    private fun updateChildName(intent: android.content.Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    fun exitGame(resultCode: Int) {
        if (isFinishing || isDestroyed) return
        exitRequested = true
        exitResultCode = resultCode

        val resultIntent = Intent().apply {
            putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
            putExtra("ritmo_result_code", resultCode)
        }
        setResult(resultCode, resultIntent)
        finish()
        overridePendingTransition(0, 0)

        if (resultCode == Activity.RESULT_CANCELED) {
            scheduleGodotProcessReset()
        }
    }

    private fun scheduleGodotProcessReset() {
        if (processResetScheduled) return
        processResetScheduled = true

        Handler(Looper.getMainLooper()).postDelayed({
            Process.killProcess(Process.myPid())
        }, 250)
    }
}
