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
 * Dedicated Godot host for Brush game payload.
 */
class BrushGodotActivity : GodotActivity() {

    companion object {
        private const val TAG = "BrushGodotActivity"
        private const val BRUSH_ASSETS_MARKER_VERSION = "brush_assets_v3_force_clean_fullpack"
        private const val MIRROR_READY_FILE = ".mirror_ready"
        private val USERDATA_PROJECT_NAMES = listOf(
            "Ritmo",
            "ritmo",
            "brush game",
            "brush_game",
            "anonymous",
            "com.anonymous.ritmo",
            "com.anonymous.ritmo.brush",
        )
    }

    private var exitResultCode = Activity.RESULT_CANCELED
    private var exitRequested = false
    private var brushPayloadReady = false
    private var startupFailureReason: String? = null
    private var shouldKillProcessOnBackExit = false
    @Volatile private var completionPreCommitted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // EatLauncher.gdc currently recognizes only eat mode for runtime pack switching.
        RitmoPlugin.gameMode = "eat"
        RitmoPlugin.launchCounter++
        writeLaunchModeMarker("eat")

        val packagedReady = hasPackagedBrushAssets()
        if (packagedReady) {
            // Avoid blocking first-launch UI with file copy work.
            warmPrepareBrushProjectPathAsync()
        } else {
            prepareBrushProjectPath()
        }
        val outDir = File(filesDir, "godot-eat")
        val packFile = resolvePreferredBrushPack(outDir)
        val projectBinaryFile = File(outDir, "project.binary")
        val extractedReady = packFile != null && projectBinaryFile.exists() && projectBinaryFile.length() > 0L
        brushPayloadReady = extractedReady || packagedReady

        if (!brushPayloadReady && startupFailureReason.isNullOrBlank()) {
            startupFailureReason = buildString {
                append("brush_payload_not_ready;outDir=")
                append(outDir.absolutePath)
                append(";pack=")
                append(packFile?.absolutePath ?: "missing")
                append(";projectBinary=")
                append(if (projectBinaryFile.exists()) projectBinaryFile.length() else 0L)
                append(";packagedReady=")
                append(packagedReady)
            }
        }
        if (!brushPayloadReady) Log.e(TAG, "Brush payload not ready: $startupFailureReason")

        super.onCreate(savedInstanceState)
        setResult(Activity.RESULT_CANCELED)
        updateChildName(intent)

        if (!brushPayloadReady) {
            runOnUiThread { exitGame(Activity.RESULT_CANCELED) }
        }
    }

    override fun onResume() {
        super.onResume()
        RitmoPlugin.gameMode = "eat"
        writeLaunchModeMarker("eat")
    }

    override fun onNewIntent(newIntent: Intent) {
        super.onNewIntent(newIntent)
        setIntent(newIntent)
        updateChildName(newIntent)
    }

    override fun onDestroy() {
        RitmoPlugin.gameMode = "school"
        RitmoPlugin.childName = "Kid"
        writeLaunchModeMarker("school")
        super.onDestroy()
    }

    override fun finish() {
        if (!exitRequested) {
            val resultCode = if (completionPreCommitted) Activity.RESULT_OK else Activity.RESULT_CANCELED
            val resultIntent = Intent().apply {
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
        val args = mutableListOf<String>()
        args.add("--rendering-driver")
        args.add("opengl3")
        Log.i(TAG, "Brush boot with sparse pack discovery from userdata/assets")
        return args
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

    fun exitGame(resultCode: Int) {
        Log.i(TAG, "exitGame(resultCode=$resultCode, preCommitted=$completionPreCommitted)")
        if (isFinishing || isDestroyed) return
        if (completionPreCommitted && resultCode != Activity.RESULT_OK) return

        exitRequested = true
        exitResultCode = resultCode
        persistCompletionFlag(resultCode == Activity.RESULT_OK)

        val resultIntent = Intent().apply {
            putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
            putExtra("ritmo_result_code", resultCode)
            putExtra("ritmo_back_exit", resultCode == Activity.RESULT_CANCELED && shouldKillProcessOnBackExit)
            if (!startupFailureReason.isNullOrBlank()) {
                putExtra("ritmo_startup_failed", true)
                putExtra("ritmo_startup_error", startupFailureReason)
            }
        }
        setResult(resultCode, resultIntent)
        finish()
        overridePendingTransition(0, 0)

        if (resultCode == Activity.RESULT_CANCELED && shouldKillProcessOnBackExit) {
            scheduleProcessTerminationForBackExit()
        }
    }

    private fun scheduleProcessTerminationForBackExit() {
        val launchToken = RitmoPlugin.launchCounter
        Handler(Looper.getMainLooper()).postDelayed({
            if (RitmoPlugin.launchCounter == launchToken) {
                Process.killProcess(Process.myPid())
            }
        }, 300)
    }

    private fun persistCompletionFlag(completed: Boolean) {
        val prefs = getSharedPreferences("ritmo_game", Activity.MODE_PRIVATE)
        prefs.edit()
            .putBoolean("godot_game_completed", completed)
            .putLong("godot_game_completed_at", System.currentTimeMillis())
            .commit()
    }

    private fun updateChildName(intent: Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    fun preCommitCompletion() {
        Log.i(TAG, "preCommitCompletion()")
        completionPreCommitted = true
    }

    private fun warmPrepareBrushProjectPathAsync() {
        Thread {
            try {
                prepareBrushProjectPath()
            } catch (_: Exception) {
                // Best effort warm-up only.
            }
        }.start()
    }

    private fun prepareBrushProjectPath() {
        try {
            val outDir = File(filesDir, "godot-eat")
            if (!outDir.exists()) outDir.mkdirs()

            val outSparsePack = File(outDir, "assets.sparsepck")
            val outProjectBinary = File(outDir, "project.binary")
            val readyMarker = File(outDir, ".assets_ready")
            val markerValue = if (readyMarker.exists()) readyMarker.readText() else ""
            val outFullMainPack = File(outDir, "full_main.pck")
            val hasValidPack =
                (outFullMainPack.exists() && outFullMainPack.length() > 0L) ||
                (outSparsePack.exists() && outSparsePack.length() > 0L)
            val hasProjectBinary = outProjectBinary.exists() && outProjectBinary.length() > 0L

            if (markerValue != BRUSH_ASSETS_MARKER_VERSION || !hasValidPack || !hasProjectBinary) {
                // Prevent stale files from previous payloads from contaminating current mode.
                if (outDir.exists()) outDir.deleteRecursively()
                outDir.mkdirs()

                copyBrushAssets(outDir)
                readyMarker.writeText(BRUSH_ASSETS_MARKER_VERSION)
            }

            mirrorBrushAssetsToUserDataDirs(outDir)
        } catch (e: Exception) {
            startupFailureReason = "brush_prepare_exception:${e.javaClass.simpleName}:${e.message ?: "unknown"}"
            Log.e(TAG, "Failed preparing brush payload", e)
        }
    }

    private fun resolvePreferredBrushPack(outDir: File): File? {
        return File(outDir, "full_main.pck").takeIf { it.exists() && it.length() > 0L }
            ?: File(outDir, "assets.sparsepck").takeIf { it.exists() && it.length() > 0L }
    }

    private fun hasPackagedBrushAssets(): Boolean {
        return assetExists("brushgame/assets.sparsepck") && assetExists("brushgame/project.binary")
    }

    private fun assetExists(assetPath: String): Boolean {
        return try {
            assets.open(assetPath).use { true }
        } catch (_: Exception) {
            false
        }
    }

    private fun copyBrushAssets(outputDir: File) {
        copyAssetTree("brushgame", outputDir)
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
        } catch (e: IOException) {
            if (assetPath.endsWith("project.binary") ||
                assetPath.endsWith("assets.sparsepck") ||
                assetPath.endsWith("full_main.pck")
            ) {
                startupFailureReason = "brush_copy_failed:${assetPath}:${e.message ?: "io_error"}"
                Log.e(TAG, "Critical brush asset copy failed for $assetPath", e)
            }
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

    private fun mirrorBrushAssetsToUserDataDirs(sourceDir: File) {
        val targetRoots = linkedSetOf<File>()
        for (projectName in USERDATA_PROJECT_NAMES) {
            targetRoots.add(File(filesDir, "app_userdata/$projectName"))
        }
        for (dir in listKnownUserDataDirs()) {
            targetRoots.add(dir)
        }

        for (root in targetRoots) {
            val targetDir = File(root, "godot-eat")
            mirrorPayloadIfNeeded(sourceDir, targetDir)
        }
    }

    private fun mirrorPayloadIfNeeded(sourceDir: File, targetDir: File) {
        val readyMarker = File(targetDir, MIRROR_READY_FILE)
        val markerMatches = readyMarker.exists() && readyMarker.readText() == BRUSH_ASSETS_MARKER_VERSION
        val hasProjectBinary = File(targetDir, "project.binary").exists()
        val hasPack = File(targetDir, "full_main.pck").exists() || File(targetDir, "assets.sparsepck").exists()

        if (markerMatches && hasProjectBinary && hasPack) return

        copyDirectory(sourceDir, targetDir)
        readyMarker.parentFile?.mkdirs()
        readyMarker.writeText(BRUSH_ASSETS_MARKER_VERSION)
    }

    private fun listKnownUserDataDirs(): List<File> {
        val appUserData = File(filesDir, "app_userdata")
        return appUserData.listFiles()?.filter { it.isDirectory } ?: emptyList()
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
