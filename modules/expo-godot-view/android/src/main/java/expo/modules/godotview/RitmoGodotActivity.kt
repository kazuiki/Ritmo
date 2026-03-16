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
    companion object {
        private val USERDATA_PROJECT_NAMES = listOf(
            "Ritmo",
            "ritmo",
            "eat game",
            "eat_game",
            "anonymous",
            "com.anonymous.ritmo",
            "com.anonymous.ritmo.eat",
        )
    }

    private var exitResultCode = Activity.RESULT_CANCELED
    private var exitRequested = false
    private var processResetScheduled = false
    private var launchMode: String = "school"
    @Volatile private var completionPreCommitted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        launchMode = intent?.getStringExtra("ritmo_launch_mode")?.trim()?.lowercase() ?: "school"
        if (launchMode == "eat") {
            // Defensive fallback: if Eat flow lands in RitmoGodotActivity, prepare eat payload anyway.
            prepareEatAssetsForRouting()
            RitmoPlugin.gameMode = "eat"
            writeLaunchModeMarker("eat")
        } else {
            RitmoPlugin.gameMode = "school"
            writeLaunchModeMarker("school")
        }
        // Increment process-level counter so any pending kill from a previous game is cancelled.
        RitmoPlugin.launchCounter++
        super.onCreate(savedInstanceState)

        setResult(Activity.RESULT_CANCELED)
        updateChildName(intent)
    }

    override fun onResume() {
        super.onResume()
        if (launchMode == "eat") {
            RitmoPlugin.gameMode = "eat"
            writeLaunchModeMarker("eat")
        } else {
            RitmoPlugin.gameMode = "school"
            writeLaunchModeMarker("school")
        }
    }

    override fun onNewIntent(newIntent: android.content.Intent) {
        super.onNewIntent(newIntent)
        setIntent(newIntent)
        updateChildName(newIntent)
    }

    override fun onDestroy() {
        RitmoPlugin.gameMode = "school"
        RitmoPlugin.childName = "Kid"
        super.onDestroy()
    }

    override fun finish() {
        if (!exitRequested) {
            val resultCode = if (completionPreCommitted) Activity.RESULT_OK else Activity.RESULT_CANCELED
            val resultIntent = android.content.Intent().apply {
                putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
                putExtra("ritmo_result_code", resultCode)
            }
            setResult(resultCode, resultIntent)
        }
        super.finish()
    }

    override fun onBackPressed() {
        if (!completionPreCommitted) {
            exitGame(Activity.RESULT_CANCELED)
        }
    }

    override fun getHostPlugins(godot: Godot): MutableSet<GodotPlugin> {
        return mutableSetOf(RitmoPlugin(godot))
    }

    override fun getCommandLine(): MutableList<String> {
        if (launchMode == "school") {
            return super.getCommandLine()
        }

        val projectPath = intent?.getStringExtra("ritmo_project_path")
        val normalizedProjectPath = projectPath?.trim()
        val hasProjectPath = !normalizedProjectPath.isNullOrBlank()
        val mainPackExtra = intent?.getStringExtra("ritmo_main_pack")
        val resolvedMainPack = when {
            !mainPackExtra.isNullOrBlank() -> mainPackExtra
            else -> null
        }

        if (!resolvedMainPack.isNullOrBlank()) {
            val args = mutableListOf<String>()
            if (hasProjectPath) {
                args.add("--path")
                args.add(normalizedProjectPath!!)
            }
            args.add("--main-pack")
            args.add(resolvedMainPack)
            return args
        }

        if (hasProjectPath) {
            val args = mutableListOf<String>()
            args.add("--path")
            args.add(normalizedProjectPath!!)
            return args
        }

        return super.getCommandLine()
    }

    override fun onGodotForceQuit(instance: Godot) {
        runOnUiThread {
            if (exitRequested) {
                exitGame(exitResultCode)
            } else {
                exitGame(Activity.RESULT_CANCELED)
            }
        }
    }

    override fun onGodotRestartRequested(instance: Godot) {
        runOnUiThread {
            if (exitRequested) {
                exitGame(exitResultCode)
            } else {
                exitGame(Activity.RESULT_CANCELED)
            }
        }
    }

    private fun updateChildName(intent: android.content.Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    /** Called by RitmoPlugin.gameCompleted() to lock in RESULT_OK before posting to the UI thread. */
    fun preCommitCompletion() {
        completionPreCommitted = true
    }

    fun exitGame(resultCode: Int) {
        if (isFinishing || isDestroyed) return
        // Protected completion: once gameCompleted() is pre-committed, reject any cancel override.
        if (completionPreCommitted && resultCode != Activity.RESULT_OK) return
        exitRequested = true
        exitResultCode = resultCode

        val resultIntent = Intent().apply {
            putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
            putExtra("ritmo_result_code", resultCode)
        }
        setResult(resultCode, resultIntent)
        finish()
        overridePendingTransition(0, 0)

        // Always kill the :godot process so the next game launch gets a clean Godot state.
        // The captured counter prevents this kill from hitting a concurrently starting game.
        val capturedCount = RitmoPlugin.launchCounter
        scheduleGodotProcessReset(2500L, capturedCount)
    }

    private fun scheduleGodotProcessReset(delayMs: Long, capturedCount: Int) {
        if (processResetScheduled) return
        processResetScheduled = true

        Handler(Looper.getMainLooper()).postDelayed({
            // Only kill if no new game has started since we scheduled this kill.
            if (RitmoPlugin.launchCounter == capturedCount) {
                Process.killProcess(Process.myPid())
            }
        }, delayMs)
    }

    private fun prepareEatAssetsForRouting() {
        try {
            val outDir = File(filesDir, "godot-eat")
            if (!outDir.exists()) outDir.mkdirs()
            copyAssetTree("eatgame", outDir)
            val outFullMainPack = File(outDir, "full_main.pck")
            val outEatFullPack = File(outDir, "eat_full.pck")
            if ((!outFullMainPack.exists() || outFullMainPack.length() <= 0L) &&
                outEatFullPack.exists() && outEatFullPack.length() > 0L
            ) {
                outEatFullPack.copyTo(outFullMainPack, overwrite = true)
            }
            mirrorEatAssetsToUserDataDirs(outDir)
        } catch (_: Exception) {
            // Best effort only. If extraction fails, host continues with default school flow.
        }
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
            // Ignore optional/missing files.
        }
    }

    private fun writeLaunchModeMarker(mode: String) {
        try {
            val markerName = "ritmo_launch_mode.txt"
            val markerPaths = linkedSetOf<File>()
            markerPaths.add(File(filesDir, markerName))
            for (projectName in USERDATA_PROJECT_NAMES) {
                markerPaths.add(File(File(filesDir, "app_userdata/$projectName"), markerName))
            }
            for (dir in listKnownUserDataDirs()) {
                markerPaths.add(File(dir, markerName))
            }

            for (markerFile in markerPaths) {
                markerFile.parentFile?.mkdirs()
                markerFile.writeText(mode, Charset.forName("UTF-8"))
            }
        } catch (_: Exception) {
            // Best-effort marker for GDScript boot routing.
        }
    }

    private fun mirrorEatAssetsToUserDataDirs(sourceDir: File) {
        val targetRoots = linkedSetOf<File>()
        for (projectName in USERDATA_PROJECT_NAMES) {
            targetRoots.add(File(filesDir, "app_userdata/$projectName"))
        }
        for (dir in listKnownUserDataDirs()) {
            targetRoots.add(dir)
        }

        for (root in targetRoots) {
            val targetDir = File(root, "godot-eat")
            copyDirectory(sourceDir, targetDir)
        }
    }

    private fun listKnownUserDataDirs(): List<File> {
        val appUserData = File(filesDir, "app_userdata")
        val dirs = appUserData.listFiles()?.filter { it.isDirectory } ?: emptyList()
        return dirs
    }

    private fun copyDirectory(source: File, target: File) {
        if (source.isDirectory) {
            if (!target.exists()) target.mkdirs()
            val children = source.listFiles() ?: return
            for (child in children) {
                copyDirectory(child, File(target, child.name))
            }
            return
        }

        target.parentFile?.mkdirs()
        source.inputStream().use { input ->
            target.outputStream().use { output -> input.copyTo(output) }
        }
    }
}
