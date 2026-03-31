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
 * Dedicated Godot host for Make Hair game payload.
 * Routes to make_hair-specific launch mode and uses base payload.
 */
class MakeHairGodotActivity : GodotActivity() {
    companion object {
        private const val TAG = "MakeHairGodotActivity"
        private const val MAKE_HAIR_ASSETS_MARKER_VERSION = "make_hair_assets_v1_force_clean_fullpack"
        private const val MIRROR_READY_FILE = ".mirror_ready"
        @Volatile private var lastLaunchModeMarkerWritten: String? = null
        private val USERDATA_PROJECT_NAMES = listOf(
            "Ritmo",
            "ritmo",
            "make hair",
            "make_hair",
            "hair",
            "anonymous",
            "com.anonymous.ritmo",
            "com.anonymous.ritmo.hair",
        )
    }

    private var exitResultCode = Activity.RESULT_CANCELED
    private var exitRequested = false
    private var makeHairPayloadReady = false
    private var startupFailureReason: String? = null
    private var shouldKillProcessOnBackExit = false
    @Volatile private var completionPreCommitted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        // EatLauncher.gdc currently recognizes only eat mode for runtime pack switching.
        RitmoPlugin.gameMode = "eat"
        RitmoPlugin.launchCounter++
        writeLaunchModeMarker("eat")

        val packagedReady = hasPackagedMakeHairAssets()
        if (packagedReady) {
            // Avoid blocking first-launch UI with file copy work.
            warmPrepareMakeHairProjectPathAsync()
        } else {
            prepareMakeHairProjectPath()
        }
        val outDir = File(filesDir, "godot-eat")
        val packFile = resolvePreferredMakeHairPack(outDir)
        val projectBinaryFile = File(outDir, "project.binary")
        val extractedReady = packFile != null && projectBinaryFile.exists() && projectBinaryFile.length() > 0L
        makeHairPayloadReady = extractedReady || packagedReady

        if (!makeHairPayloadReady && startupFailureReason.isNullOrBlank()) {
            startupFailureReason = buildString {
                append("make_hair_payload_not_ready;outDir=")
                append(outDir.absolutePath)
                append(";pack=")
                append(packFile?.absolutePath ?: "missing")
                append(";projectBinary=")
                append(if (projectBinaryFile.exists()) projectBinaryFile.length() else 0L)
                append(";packagedReady=")
                append(packagedReady)
            }
        }
        if (!makeHairPayloadReady) Log.e(TAG, "Make Hair payload not ready: $startupFailureReason")

        super.onCreate(savedInstanceState)
        setResult(Activity.RESULT_CANCELED)
        updateChildName(intent)

        if (!makeHairPayloadReady) {
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
        val outDir = File(filesDir, "godot-eat")
        val projectBinaryFile = File(outDir, "project.binary")
        val preferredPack = resolvePreferredMakeHairPack(outDir)

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

        Log.i(TAG, "Make Hair boot args: path=${outDir.absolutePath}, pack=${preferredPack?.absolutePath}")
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

        scheduleProcessTerminationAfterExit()
    }

    private fun scheduleProcessTerminationAfterExit() {
        val launchToken = RitmoPlugin.launchCounter
        Handler(Looper.getMainLooper()).postDelayed({
            if (RitmoPlugin.launchCounter == launchToken) {
                clearMakeHairRuntimePayload()
                Process.killProcess(Process.myPid())
            }
        }, 800)
    }

    private fun clearMakeHairRuntimePayload() {
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

    private fun updateChildName(intent: Intent?) {
        val childName = intent?.getStringExtra("child_name") ?: "Kid"
        RitmoPlugin.childName = childName
    }

    fun preCommitCompletion() {
        Log.i(TAG, "preCommitCompletion()")
        completionPreCommitted = true
    }

    private fun warmPrepareMakeHairProjectPathAsync() {
        Thread {
            try {
                prepareMakeHairProjectPath()
            } catch (_: Exception) {
                // Best effort warm-up only.
            }
        }.start()
    }

    private fun prepareMakeHairProjectPath() {
        try {
            val outDir = File(filesDir, "godot-eat")
            if (!outDir.exists()) outDir.mkdirs()

            val outSparsePack = File(outDir, "assets.sparsepck")
            val outFullMainPack = File(outDir, "full_main.pck")
            val outMakeHairFullPack = File(outDir, "make_hair_full.pck")
            val outProjectBinary = File(outDir, "project.binary")
            val readyMarker = File(outDir, ".assets_ready")
            val markerValue = if (readyMarker.exists()) readyMarker.readText() else ""
            val hasValidPack =
                (outFullMainPack.exists() && outFullMainPack.length() > 0L) ||
                (outMakeHairFullPack.exists() && outMakeHairFullPack.length() > 0L) ||
                (outSparsePack.exists() && outSparsePack.length() > 0L)
            val hasProjectBinary = outProjectBinary.exists() && outProjectBinary.length() > 0L

            if (markerValue != MAKE_HAIR_ASSETS_MARKER_VERSION || !hasValidPack || !hasProjectBinary) {
                if (outDir.exists()) outDir.deleteRecursively()
                outDir.mkdirs()

                copyMakeHairAssets(outDir)
                if (!outFullMainPack.exists() || outFullMainPack.length() <= 0L) {
                    if (outMakeHairFullPack.exists() && outMakeHairFullPack.length() > 0L) {
                        outMakeHairFullPack.copyTo(outFullMainPack, overwrite = true)
                    }
                }
                readyMarker.writeText(MAKE_HAIR_ASSETS_MARKER_VERSION)
            }

            mirrorMakeHairAssetsToUserDataDirs(outDir)
        } catch (e: Exception) {
            startupFailureReason = "make_hair_prepare_exception:${e.javaClass.simpleName}:${e.message ?: "unknown"}"
            Log.e(TAG, "Failed preparing Make Hair payload", e)
        }
    }

    private fun resolvePreferredMakeHairPack(outDir: File): File? {
        return File(outDir, "full_main.pck").takeIf { it.exists() && it.length() > 0L }
            ?: File(outDir, "assets.sparsepck").takeIf { it.exists() && it.length() > 0L }
            ?: File(outDir, "make_hair_full.pck").takeIf { it.exists() && it.length() > 0L }
    }

    private fun hasPackagedMakeHairAssets(): Boolean {
        return assetExists("makehair/assets.sparsepck") && assetExists("makehair/project.binary")
    }

    private fun assetExists(assetPath: String): Boolean {
        return try {
            assets.open(assetPath).use { true }
        } catch (_: Exception) {
            false
        }
    }

    private fun copyMakeHairAssets(outputDir: File) {
        if (hasPackagedMakeHairAssets()) {
            copyAssetTree("makehair", outputDir)
            return
        }

        val downloadedDir = resolveDownloadedPayloadDir("makehair")
        if (downloadedDir != null) {
            copyDirectory(downloadedDir, outputDir)
            return
        }

        startupFailureReason = "makehair_source_missing:packaged_and_downloaded_absent"
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
        val altFullPack = File(dir, "make_hair_full.pck")

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
                assetPath.endsWith("make_hair_full.pck")
            ) {
                startupFailureReason = "make_hair_copy_failed:${assetPath}:${e.message ?: "io_error"}"
                Log.e(TAG, "Critical Make Hair asset copy failed for $assetPath", e)
            }
        }
    }

    private fun writeLaunchModeMarker(mode: String) {
        if (lastLaunchModeMarkerWritten == mode) return
        lastLaunchModeMarkerWritten = mode

        Thread {
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
        }.start()
    }

    private fun mirrorMakeHairAssetsToUserDataDirs(sourceDir: File) {
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
        val markerMatches = readyMarker.exists() && readyMarker.readText() == MAKE_HAIR_ASSETS_MARKER_VERSION
        val hasProjectBinary = File(targetDir, "project.binary").exists()
        val hasPack =
            File(targetDir, "full_main.pck").exists() ||
            File(targetDir, "make_hair_full.pck").exists() ||
            File(targetDir, "assets.sparsepck").exists()

        if (markerMatches && hasProjectBinary && hasPack) return

        if (targetDir.exists()) {
            targetDir.deleteRecursively()
        }
        targetDir.mkdirs()
        copyDirectory(sourceDir, targetDir)
        readyMarker.parentFile?.mkdirs()
        readyMarker.writeText(MAKE_HAIR_ASSETS_MARKER_VERSION)
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
