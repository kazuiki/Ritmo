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
    private var eatPayloadReady = false
    private var startupFailureReason: String? = null
    private var shouldKillProcessOnBackExit = false
    @Volatile private var completionPreCommitted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // Signal GDScript that this is an eat game launch (read via RitmoPlugin.getGameMode())
        RitmoPlugin.gameMode = "eat"
        // Increment process-level counter so any pending kill from a previous game is cancelled.
        RitmoPlugin.launchCounter++
        writeLaunchModeMarker("eat")
        val packagedReady = hasPackagedEatAssets()
        // Prepare synchronously so engine starts only after payload is ready.
        prepareEatProjectPath()
        val outDir = File(filesDir, "godot-eat")
        val packFile = resolvePreferredEatPack(outDir)
        val projectBinaryFile = File(outDir, "project.binary")
        val extractedReady = packFile != null && projectBinaryFile.exists() && projectBinaryFile.length() > 0L
        // Launch depends on extracted runtime payload in outDir, not just packaged source availability.
        eatPayloadReady = extractedReady
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
        val outDir = File(filesDir, "godot-eat")
        val projectBinaryFile = File(outDir, "project.binary")
        val preferredPack = resolvePreferredEatPack(outDir)

        args.add("--rendering-driver")
        args.add("opengl3")

        if (projectBinaryFile.exists() && projectBinaryFile.length() > 0L) {
            args.add("--path")
            args.add(outDir.absolutePath)
        }

        if (preferredPack != null) {
            args.add("--main-pack")
            args.add(preferredPack.absolutePath)
        }

        Log.i(TAG, "Eat boot args: path=${outDir.absolutePath}, pack=${preferredPack?.absolutePath}")
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
            putExtra("ritmo_back_exit", resultCode == Activity.RESULT_CANCELED && shouldKillProcessOnBackExit)
            if (!startupFailureReason.isNullOrBlank()) {
                putExtra("ritmo_startup_failed", true)
                putExtra("ritmo_startup_error", startupFailureReason)
            }
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
                clearEatRuntimePayload()
                Process.killProcess(Process.myPid())
            }
        }, 800)
    }

    private fun clearEatRuntimePayload() {
        try {
            // Remove local extracted payload cache.
            File(filesDir, "godot-eat").deleteRecursively()

            // Remove mirrored payload cache from known user:// roots.
            val knownRoots = listKnownUserDataDirs()
            for (root in knownRoots) {
                File(root, "godot-eat").deleteRecursively()
            }

            // Defensive fallback roots for older installs.
            File(filesDir, "app_userdata/$packageName/godot-eat").deleteRecursively()
            File(filesDir, "app_userdata/com.anonymous.ritmo/godot-eat").deleteRecursively()
        } catch (_: Exception) {
            // Best-effort cleanup only.
        }
    }

    private fun updateChildName(intent: Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    /** Called by RitmoPlugin.gameCompleted() to lock in RESULT_OK before posting to the UI thread. */
    fun preCommitCompletion() {
        completionPreCommitted = true
    }

    private fun warmPrepareEatProjectPathAsync() {
        Thread {
            try {
                prepareEatProjectPath()
            } catch (_: Exception) {
                // Best effort warm-up only.
            }
        }.start()
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
        val downloadedDir = resolveDownloadedPayloadDir("eat")
        if (downloadedDir != null) {
            copyDirectory(downloadedDir, outputDir)
            return
        }

        if (hasPackagedEatAssets()) {
            copyAssetTree("eatgame", outputDir)
            return
        }

        startupFailureReason = "eat_source_missing:packaged_and_downloaded_absent"
    }

    private fun resolveDownloadedPayloadDir(gameKey: String): File? {
        val directDir = File(filesDir, "godot-payloads/$gameKey")
        if (hasValidDownloadedPayload(directDir)) {
            return directDir
        }

        return filesDir.walkTopDown()
            .maxDepth(8)
            .firstOrNull { candidate ->
                candidate.isDirectory &&
                    candidate.name.equals(gameKey, ignoreCase = true) &&
                    candidate.parentFile?.name == "godot-payloads" &&
                    hasValidDownloadedPayload(candidate)
            }
    }

    private fun hasValidDownloadedPayload(dir: File): Boolean {
        if (!dir.exists() || !dir.isDirectory) return false

        val projectBinary = File(dir, "project.binary")
        val fullPack = File(dir, "full_main.pck")
        val sparsePack = File(dir, "assets.sparsepck")
        val altFullPack = File(dir, "eat_full.pck")

        return projectBinary.exists() && projectBinary.length() > 0L &&
            ((fullPack.exists() && fullPack.length() > 0L) ||
                (sparsePack.exists() && sparsePack.length() > 0L) ||
                (altFullPack.exists() && altFullPack.length() > 0L))
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
        val markerMatches = readyMarker.exists() && readyMarker.readText() == EAT_ASSETS_MARKER_VERSION
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
        readyMarker.writeText(EAT_ASSETS_MARKER_VERSION)
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
