package expo.modules.godotview

import android.content.Context
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import org.godotengine.godot.Godot
import org.godotengine.godot.GodotFragment

class ExpoGodotView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val container: FrameLayout
  private var godotFragment: GodotFragment? = null
  private var currentScene: String = ""

  init {
    container = FrameLayout(context)
    container.id = android.view.View.generateViewId()
    container.layoutParams = ViewGroup.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT
    )
    addView(container)
  }

  fun loadScene(scene: String) {
    currentScene = scene
    post {
      initializeGodot()
    }
  }

  private fun initializeGodot() {
    try {
      val activity = appContext.currentActivity as? FragmentActivity ?: return
      
      if (godotFragment == null) {
        // Create GodotFragment with command line arguments in Bundle
        godotFragment = GodotFragment()
        val args = Bundle()
        args.putStringArray("command_line_params", buildCommandLineParams())
        godotFragment!!.arguments = args
        
        activity.runOnUiThread {
          val fragmentManager = activity.supportFragmentManager
          val transaction = fragmentManager.beginTransaction()
          transaction.replace(container.id, godotFragment!!)
          transaction.commitNow()
          
          // Notify that game is ready
          dispatchEvent("onGameReady", mapOf("scene" to currentScene))
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
      android.util.Log.e("ExpoGodotView", "Failed to initialize Godot: ${e.message}", e)
    }
  }

  private fun buildCommandLineParams(): Array<String> {
    val params = mutableListOf("--path", "/android_asset")
    resolveMainPackPath()?.let {
      params.add("--main-pack")
      params.add(it)
    }
    if (!params.contains("--main-pack")) {
      Log.w("ExpoGodotView", "No main pack detected in assets; Godot may fail to start")
    }
    Log.i("ExpoGodotView", "Godot args: $params")
    return params.toTypedArray()
  }

  private fun resolveMainPackPath(): String? {
    val candidates = listOf("Ritmo.pck", "main.pck", "data.pck", "assets.sparsepck")
    for (candidate in candidates) {
      try {
        context.assets.open(candidate).close()
        return "/android_asset/$candidate"
      } catch (_: Exception) {
        // Continue to next candidate.
      }
    }
    return null
  }

  private fun dispatchEvent(eventName: String, params: Map<String, Any>) {
    // Event dispatching will be handled by Expo
  }
}
