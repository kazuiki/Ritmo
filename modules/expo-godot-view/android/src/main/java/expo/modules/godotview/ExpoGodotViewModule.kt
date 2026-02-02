package expo.modules.godotview

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
  }
}
