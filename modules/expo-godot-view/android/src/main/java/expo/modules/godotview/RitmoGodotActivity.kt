package expo.modules.godotview

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Process
import androidx.fragment.app.FragmentActivity
import org.godotengine.godot.Godot
import org.godotengine.godot.GodotFragment
import org.godotengine.godot.GodotHost
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
class RitmoGodotActivity : FragmentActivity(), GodotHost {

    private var godotFragment: GodotFragment? = null
    private var isCleaningUp: Boolean = false
    private var shouldTerminateProcess: Boolean = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Default result is CANCELED (user pressed back / exited early)
        setResult(Activity.RESULT_CANCELED)

        updateChildName(intent)
        createFreshGodotFragment()
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        updateChildName(intent)
        createFreshGodotFragment()
    }

    override fun onPause() {
        super.onPause()
        if (isFinishing || isDestroyed) {
            releaseGodotFragment()
        }
    }

    override fun onStop() {
        super.onStop()
        if (isFinishing || isDestroyed) {
            releaseGodotFragment()
        }
    }

    override fun onDestroy() {
        releaseGodotFragment()
        RitmoPlugin.childName = "Kid"
        super.onDestroy()
        if (shouldTerminateProcess) {
            terminateGodotProcess()
        }
    }

    override fun finish() {
        releaseGodotFragment()
        super.finish()
    }

    // ---- GodotHost interface ----

    override fun getCommandLine(): List<String> {
        // Force OpenGL3 renderer (Vulkan fails on many emulators/devices)
        return listOf("--rendering-driver", "opengl3")
    }

    override fun getHostPlugins(godot: Godot): MutableSet<GodotPlugin> {
        // Register RitmoPlugin so GDScript can call Engine.get_singleton("RitmoPlugin")
        return mutableSetOf(RitmoPlugin(godot))
    }

    override fun getActivity(): Activity = this

    override fun getGodot(): Godot? = godotFragment?.godot

    private fun updateChildName(intent: android.content.Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    private fun createFreshGodotFragment() {
        if (isCleaningUp || isFinishing || isDestroyed) return
        releaseGodotFragment()
        godotFragment = GodotFragment()
        supportFragmentManager.beginTransaction()
            .replace(android.R.id.content, godotFragment!!)
            .commitNowAllowingStateLoss()
    }

    fun exitGame(resultCode: Int) {
        if (isFinishing || isDestroyed) return
        shouldTerminateProcess = true
        setResult(resultCode)
        releaseGodotFragment()
        finishAndRemoveTask()
        finish()
        overridePendingTransition(0, 0)
    }

    private fun terminateGodotProcess() {
        Handler(Looper.getMainLooper()).postDelayed({
            Process.killProcess(Process.myPid())
        }, 60)
    }

    private fun releaseGodotFragment() {
        if (isCleaningUp) return
        isCleaningUp = true
        try {
            val fragment = godotFragment
            if (fragment != null && fragment.isAdded) {
                supportFragmentManager.beginTransaction()
                    .remove(fragment)
                    .commitNowAllowingStateLoss()
            }
            supportFragmentManager.executePendingTransactions()
            godotFragment = null
        } finally {
            isCleaningUp = false
        }
    }
}
