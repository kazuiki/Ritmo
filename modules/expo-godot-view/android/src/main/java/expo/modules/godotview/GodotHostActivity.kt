package expo.modules.godotview

import androidx.fragment.app.FragmentActivity
import org.godotengine.godot.Godot
import org.godotengine.godot.GodotHost
import org.godotengine.godot.plugin.GodotPlugin

/**
 * A wrapper that makes any FragmentActivity implement GodotHost interface.
 * This is required for GodotFragment to work properly.
 */
class GodotHostActivity(
    private val activity: FragmentActivity
) : GodotHost {
    
    private var godotInstance: Godot? = null
    
    override fun getActivity() = activity
    
    override fun getGodot(): Godot? = godotInstance
    
    fun setGodot(godot: Godot) {
        godotInstance = godot
    }
    
    override fun getHostPlugins(godot: Godot): MutableSet<GodotPlugin> {
        return mutableSetOf()
    }
    
    override fun getCommandLine(): List<String> {
        // Tell Godot to load Ritmo.pck from the assets folder
        return listOf("--main-pack", "Ritmo.pck")
    }
}
