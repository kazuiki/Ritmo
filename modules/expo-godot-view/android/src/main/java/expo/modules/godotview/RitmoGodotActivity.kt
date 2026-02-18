package expo.modules.godotview

import android.app.Activity
import android.os.Bundle
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Read child name from Intent extras (passed by React Native)
        val childName = intent.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName

        // Default result is CANCELED (user pressed back / exited early)
        setResult(Activity.RESULT_CANCELED)

        if (savedInstanceState == null) {
            godotFragment = GodotFragment()
            supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, godotFragment!!)
                .commitNow()
        }
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
}
