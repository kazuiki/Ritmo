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
import java.io.File
import java.io.IOException
import java.nio.charset.Charset

/**
 * Dedicated Godot host for Eat game payload.
 * Uses assets/eatgame/assets.sparsepck so SchoolGame payload remains untouched.
 */
class EatGodotActivity : GodotActivity() {

    companion object {
        private const val EAT_ASSETS_MARKER_VERSION = "eat_assets_v6_force_reextract_fs_path"
    }

    private var exitResultCode = Activity.RESULT_CANCELED
    private var exitRequested = false
    private var processResetScheduled = false
    private var eatProjectPath: String? = null
    private var eatMainPackPath: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(Activity.RESULT_CANCELED)
        updateChildName(intent)
        eatProjectPath = prepareEatProjectPath()
    }

    override fun onNewIntent(newIntent: Intent) {
        super.onNewIntent(newIntent)
        setIntent(newIntent)
        updateChildName(newIntent)
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

    override fun getCommandLine(): MutableList<String> {
        val projectPath = eatProjectPath ?: prepareEatProjectPath().also { eatProjectPath = it }
        val mainPackPath = eatMainPackPath
        if (!projectPath.isNullOrBlank() && !mainPackPath.isNullOrBlank()) {
            return mutableListOf("--path", projectPath, "--main-pack", mainPackPath)
        }

        if (hasAssetFile("eatgame/project.binary") && hasAssetFile("eatgame/assets.sparsepck")) {
            return mutableListOf(
                "--path", "/android_asset/eatgame",
                "--main-pack", "/android_asset/eatgame/assets.sparsepck"
            )
        }

        return super.getCommandLine()
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

    private fun updateChildName(intent: Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    private fun prepareEatProjectPath(): String? {
        return try {
            val outDir = File(filesDir, "godot-eat")
            if (!outDir.exists()) outDir.mkdirs()
            val outPack = File(outDir, "assets.sparsepck")
            val outProjectBinary = File(outDir, "project.binary")
            val outCl = File(outDir, "_cl_")
            val readyMarker = File(outDir, ".assets_ready")
            val markerValue = if (readyMarker.exists()) readyMarker.readText() else ""

            if (markerValue != EAT_ASSETS_MARKER_VERSION || !outPack.exists() || outPack.length() == 0L || !outProjectBinary.exists() || !outCl.exists()) {
                copyEatAssets(outDir)
                readyMarker.writeText(EAT_ASSETS_MARKER_VERSION)
            }

            if (!outPack.exists() || outPack.length() == 0L || !outProjectBinary.exists() || !outCl.exists()) {
                eatMainPackPath = null
                return null
            }

            eatMainPackPath = outPack.absolutePath
            outDir.absolutePath
        } catch (error: Exception) {
            eatMainPackPath = null
            null
        }
    }

    private fun copyEatAssets(outputDir: File) {
        copyAssetTree("eatgame", outputDir)
    }

    private fun copyAssetTree(assetPath: String, outputDir: File) {
        val entries = assets.list(assetPath) ?: emptyArray()
        if (entries.isEmpty()) {
            copySingleAssetFile(assetPath, outputDir)
            return
        }

        if (!outputDir.exists()) outputDir.mkdirs()
        for (entry in entries) {
            val childAssetPath = "$assetPath/$entry"
            val childOutput = File(outputDir, entry)
            copyAssetTree(childAssetPath, childOutput)
        }
    }

    private fun copySingleAssetFile(assetPath: String, outputFile: File) {
        try {
            assets.open(assetPath).use { input ->
                outputFile.parentFile?.mkdirs()
                outputFile.outputStream().use { output -> input.copyTo(output) }
            }
        } catch (_: IOException) {
            // Keep setup resilient; missing optional editor artifacts should not crash host activity.
        }
    }

    private fun hasAssetFile(assetPath: String): Boolean {
        return try {
            assets.open(assetPath).use { true }
        } catch (_: IOException) {
            false
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
