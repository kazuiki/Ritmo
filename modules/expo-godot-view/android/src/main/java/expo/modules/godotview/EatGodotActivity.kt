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
 * Dedicated Godot host for Eat game payload.
 * Uses eatgame payload while keeping SchoolGame/root payload untouched.
 */
class EatGodotActivity : GodotActivity() {

    companion object {
        private const val TAG = "EatGodotActivity"
        private const val EAT_ASSETS_MARKER_VERSION = "eat_assets_v25_force_clean_fullpack"
        private const val PROCESS_RESET_DELAY_MS = 350L
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
    private var eatPayloadReady = false
    private var startupFailureReason: String? = null
    @Volatile private var completionPreCommitted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // Signal GDScript that this is an eat game launch (read via RitmoPlugin.getGameMode())
        RitmoPlugin.gameMode = "eat"
        // Increment process-level counter so any pending kill from a previous game is cancelled.
        RitmoPlugin.launchCounter++
        writeLaunchModeMarker("eat")
        // Extract eat assets BEFORE super.onCreate() so EatLauncher autoload (school-game PCK)
        // can find user://godot-eat/assets.sparsepck when Godot boots.
        prepareEatProjectPath()
        val outDir = File(filesDir, "godot-eat")
        val packFile = resolvePreferredEatPack(outDir)
        val projectBinaryFile = File(outDir, "project.binary")
        val extractedReady = packFile != null && projectBinaryFile.exists() && projectBinaryFile.length() > 0L
        val packagedReady = hasPackagedEatAssets()
        eatPayloadReady = extractedReady || packagedReady
        if (!eatPayloadReady && startupFailureReason.isNullOrBlank()) {
            startupFailureReason = buildString {
                append("eat_payload_not_ready;outDir="); append(outDir.absolutePath)
                append(";pack="); append(packFile?.absolutePath ?: "missing")
                append(";projectBinary="); append(if (projectBinaryFile.exists()) projectBinaryFile.length() else 0L)
                append(";packagedReady="); append(packagedReady)
            }
        }
        if (!eatPayloadReady) Log.e(TAG, "Eat payload not ready: $startupFailureReason")
        super.onCreate(savedInstanceState)
        setResult(Activity.RESULT_CANCELED)
        updateChildName(intent)
        if (!eatPayloadReady) {
            runOnUiThread { exitGame(Activity.RESULT_CANCELED) }
        }
    }

    override fun onResume() {
        super.onResume()
        // Reassert eat mode to avoid marker races with other activity lifecycle callbacks.
        RitmoPlugin.gameMode = "eat"
        writeLaunchModeMarker("eat")
    }

    override fun onNewIntent(newIntent: Intent) {
        super.onNewIntent(newIntent)
        setIntent(newIntent)
        updateChildName(newIntent)
    }

    override fun onDestroy() {
        // Reset game mode so next launch defaults to school
        RitmoPlugin.gameMode = "school"
        RitmoPlugin.childName = "Kid"
        writeLaunchModeMarker("school")
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
        // Some shipped Godot binaries reject both --path and --main-pack when
        // path overrides are disabled at compile time. Boot with default args.
        val args = super.getCommandLine()
        Log.i(TAG, "Eat boot uses default Godot command line (no pack/path overrides)")
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
        if (isFinishing || isDestroyed) return
        // Once gameCompleted() is pre-committed, a subsequent cancel cannot override RESULT_OK.
        if (completionPreCommitted && resultCode != Activity.RESULT_OK) return
        exitRequested = true
        exitResultCode = resultCode

        val resultIntent = Intent().apply {
            putExtra("ritmo_game_completed", resultCode == Activity.RESULT_OK)
            putExtra("ritmo_result_code", resultCode)
            if (!startupFailureReason.isNullOrBlank()) {
                putExtra("ritmo_startup_failed", true)
                putExtra("ritmo_startup_error", startupFailureReason)
            }
        }
        setResult(resultCode, resultIntent)
        finish()
        overridePendingTransition(0, 0)

        // Always kill the :godot process so the next game launch gets a clean Godot state.
        // The captured counter prevents this kill from hitting a concurrently starting game.
        val capturedCount = RitmoPlugin.launchCounter
        scheduleGodotProcessReset(PROCESS_RESET_DELAY_MS, capturedCount)
    }

    private fun updateChildName(intent: Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    /** Called by RitmoPlugin.gameCompleted() to lock in RESULT_OK before posting to the UI thread. */
    fun preCommitCompletion() {
        completionPreCommitted = true
    }

    private fun prepareEatProjectPath() {
        try {
            val outDir = File(filesDir, "godot-eat")
            if (!outDir.exists()) outDir.mkdirs()
            val outSparsePack = File(outDir, "assets.sparsepck")
            val outFullMainPack = File(outDir, "full_main.pck")
            val outEatFullPack = File(outDir, "eat_full.pck")
            val outProjectBinary = File(outDir, "project.binary")
            val readyMarker = File(outDir, ".assets_ready")
            val markerValue = if (readyMarker.exists()) readyMarker.readText() else ""
            val hasValidPack =
                (outFullMainPack.exists() && outFullMainPack.length() > 0L) ||
                (outEatFullPack.exists() && outEatFullPack.length() > 0L) ||
                (outSparsePack.exists() && outSparsePack.length() > 0L)
            val hasProjectBinary = outProjectBinary.exists() && outProjectBinary.length() > 0L

            if (markerValue != EAT_ASSETS_MARKER_VERSION || !hasValidPack || !hasProjectBinary) {
                // Prevent stale files from previous payloads from contaminating current mode.
                if (outDir.exists()) outDir.deleteRecursively()
                outDir.mkdirs()

                copyEatAssets(outDir)
                // Some build flows produce eat_full.pck instead of full_main.pck.
                // Keep a stable filename for launcher fallback logic.
                if (!outFullMainPack.exists() || outFullMainPack.length() <= 0L) {
                    if (outEatFullPack.exists() && outEatFullPack.length() > 0L) {
                        outEatFullPack.copyTo(outFullMainPack, overwrite = true)
                    }
                }
                readyMarker.writeText(EAT_ASSETS_MARKER_VERSION)
            }

            // Mirror eat pack to user:// paths so GDScript can call:
            //   load_resource_pack("user://godot-eat/assets.sparsepck")
            // Always mirror (not just when pack was already present) to fix first-launch case
            // where hasValidPack was false before copyEatAssets ran.
            mirrorEatAssetsToUserDataDirs(outDir)
        } catch (e: Exception) {
            startupFailureReason = "eat_prepare_exception:${e.javaClass.simpleName}:${e.message ?: "unknown"}"
            Log.e(TAG, "Failed preparing eat payload", e)
        }
    }

    private fun resolvePreferredEatPack(outDir: File): File? {
        // Prefer full pack for stability; sparse pack is fallback.
        return File(outDir, "full_main.pck").takeIf { it.exists() && it.length() > 0L }
            ?: File(outDir, "assets.sparsepck").takeIf { it.exists() && it.length() > 0L }
            ?: File(outDir, "eat_full.pck").takeIf { it.exists() && it.length() > 0L }
    }

    private fun hasPackagedEatAssets(): Boolean {
        return assetExists("eatgame/assets.sparsepck") && assetExists("eatgame/project.binary")
    }

    private fun assetExists(assetPath: String): Boolean {
        return try {
            assets.open(assetPath).use { true }
        } catch (_: Exception) {
            false
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
        } catch (e: IOException) {
            if (assetPath.endsWith("project.binary") ||
                assetPath.endsWith("assets.sparsepck") ||
                assetPath.endsWith("full_main.pck") ||
                assetPath.endsWith("eat_full.pck")
            ) {
                startupFailureReason = "eat_copy_failed:${assetPath}:${e.message ?: "io_error"}"
                Log.e(TAG, "Critical eat asset copy failed for $assetPath", e)
            }
            // Keep setup resilient; missing optional editor artifacts should not crash host activity.
        }
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

    private fun writeLaunchModeMarker(mode: String) {
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
