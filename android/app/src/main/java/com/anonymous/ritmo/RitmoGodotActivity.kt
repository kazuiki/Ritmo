package com.anonymous.ritmo

import org.godotengine.godot.GodotActivity

class RitmoGodotActivity : GodotActivity() {
	override fun getCommandLine(): MutableList<String> {
		return mutableListOf(
			"--rendering-driver",
			"opengl3"
		)
	}
}
