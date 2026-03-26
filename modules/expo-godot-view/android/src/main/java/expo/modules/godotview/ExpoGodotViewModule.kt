package expo.modules.godotview

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoGodotViewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoGodotView")

    View(ExpoGodotView::class) {
      Events("onGameReady", "onGameEvent")
      
      Prop("gameScene") { view: ExpoGodotView, scene: String ->
        view.loadScene(scene)
      }
    }

    AsyncFunction("checkGameCompleted") { ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val prefs = context.getSharedPreferences("ritmo_game", Context.MODE_PRIVATE)
      val completed = prefs.getBoolean("godot_game_completed", false)
      
      // Clear the flag for next time
      if (completed) {
        prefs.edit().putBoolean("godot_game_completed", false).apply()
      }
      
      completed
    }

    AsyncFunction("resetGameCompletedFlag") { ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val prefs = context.getSharedPreferences("ritmo_game", Context.MODE_PRIVATE)
      prefs.edit().putBoolean("godot_game_completed", false).apply()
      true
    }
  }
}
