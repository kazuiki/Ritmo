package expo.modules.godotview

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.util.Log
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
        private const val TAG = "RitmoGodotActivity"
        private const val EAT_ROUTING_ASSETS_VERSION = "eat_routing_assets_v1"
        private const val MIRROR_READY_FILE = ".mirror_ready"
        @Volatile private var lastLaunchModeMarkerWritten: String? = null
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
    private var launchMode: String = "school"
    private var shouldKillProcessOnBackExit = false
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
            writeLaunchModeMarker(launchMode)
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
            writeLaunchModeMarker(launchMode)
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
                putExtra("ritmo_back_exit", resultCode == Activity.RESULT_CANCELED && shouldKillProcessOnBackExit)
            }
            setResult(resultCode, resultIntent)
        }
        super.finish()
    }

    override fun onBackPressed() {
        if (!completionPreCommitted) {
            shouldKillProcessOnBackExit = true
            exitGame(Activity.RESULT_CANCELED)
        }
    }

    fun markBackExitRequested() {
        shouldKillProcessOnBackExit = true
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
        Log.i(TAG, "preCommitCompletion()")
        completionPreCommitted = true
    }

    fun exitGame(resultCode: Int) {
        Log.i(TAG, "exitGame(resultCode=$resultCode, preCommitted=$completionPreCommitted, launchMode=$launchMode)")
        if (isFinishing || isDestroyed) return
        // Protected completion: once gameCompleted() is pre-committed, reject any cancel override.
        if (completionPreCommitted && resultCode != Activity.RESULT_OK) return
        exitRequested = true
        exitResultCode = resultCode
        persistCompletionFlag(resultCode == Activity.RESULT_OK)

        val resultIntent = Intent().apply {
            putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
            putExtra("ritmo_result_code", resultCode)
            putExtra("ritmo_back_exit", resultCode == Activity.RESULT_CANCELED && shouldKillProcessOnBackExit)
        }
        setResult(resultCode, resultIntent)
        finish()
        overridePendingTransition(0, 0)

        scheduleProcessTerminationAfterExit()
    }

    private fun scheduleProcessTerminationAfterExit() {
        val launchToken = RitmoPlugin.launchCounter
        Handler(Looper.getMainLooper()).postDelayed({
            if (RitmoPlugin.launchCounter == launchToken) {
                clearRitmoRuntimePayload()
                Process.killProcess(Process.myPid())
            }
        }, 800)
    }

    private fun clearRitmoRuntimePayload() {
        try {
            File(filesDir, "godot-eat").deleteRecursively()

            val knownRoots = listKnownUserDataDirs()
            for (root in knownRoots) {
                File(root, "godot-eat").deleteRecursively()
            }

            File(filesDir, "app_userdata/$packageName/godot-eat").deleteRecursively()
            File(filesDir, "app_userdata/com.anonymous.ritmo/godot-eat").deleteRecursively()
        } catch (_: Exception) {
            // Best-effort cleanup only.
        }
    }

    private fun persistCompletionFlag(completed: Boolean) {
        val prefs = getSharedPreferences("ritmo_game", Activity.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("godot_game_completed", completed)
            .putLong("godot_game_completed_at", System.currentTimeMillis())
            .commit()
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
        if (lastLaunchModeMarkerWritten == mode) return
        lastLaunchModeMarkerWritten = mode

        Thread {
            try {
                val markerName = "ritmo_launch_mode.txt"
                val markerText = mode
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
                    markerFile.writeText(markerText, Charset.forName("UTF-8"))
                }
            } catch (_: Exception) {
                // Best-effort marker for GDScript boot routing.
            }
        }.start()
    }

    private fun mirrorEatAssetsToUserDataDirs(sourceDir: File) {
        val knownRoots = listKnownUserDataDirs()
        val preferredRoot =
            knownRoots.firstOrNull { it.name == packageName }
                ?: knownRoots.firstOrNull { it.name.equals("com.anonymous.ritmo", ignoreCase = true) }
                ?: knownRoots.firstOrNull()
                ?: File(filesDir, "app_userdata/$packageName")

        // Keep only one mirrored payload root to avoid multi-GB duplication.
        for (root in knownRoots) {
            if (root.absolutePath == preferredRoot.absolutePath) continue
            try {
                val duplicateMirror = File(root, "godot-eat")
                if (duplicateMirror.exists()) {
                    duplicateMirror.deleteRecursively()
                }
            } catch (_: Exception) {
                // Best-effort cleanup only.
            }
        }

        val targetDir = File(preferredRoot, "godot-eat")
        mirrorPayloadIfNeeded(sourceDir, targetDir)
    }

    private fun mirrorPayloadIfNeeded(sourceDir: File, targetDir: File) {
        val readyMarker = File(targetDir, MIRROR_READY_FILE)
        val markerMatches = readyMarker.exists() && readyMarker.readText() == EAT_ROUTING_ASSETS_VERSION
        val hasProjectBinary = File(targetDir, "project.binary").exists()
        val hasPack =
            File(targetDir, "full_main.pck").exists() ||
            File(targetDir, "eat_full.pck").exists() ||
            File(targetDir, "assets.sparsepck").exists()

        if (markerMatches && hasProjectBinary && hasPack) return

        if (targetDir.exists()) {
            targetDir.deleteRecursively()
        }
        targetDir.mkdirs()
        copyDirectory(sourceDir, targetDir)
        readyMarker.parentFile?.mkdirs()
        readyMarker.writeText(EAT_ROUTING_ASSETS_VERSION)
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

