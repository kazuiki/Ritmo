package expo.modules.godotview

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.SystemClock

/**
 * Dedicated trampoline activity for EatGame so React Native receives a stable
 * startup result before the Godot host hands control back.
 */
class EatGodotActivityLauncher : Activity() {

    private var launchStartMs: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        launchStartMs = SystemClock.elapsedRealtime()

        val launchIntent = Intent(this, EatGodotActivity::class.java).apply {
            putExtras(intent ?: Intent())
        }
        startActivityForResult(launchIntent, REQUEST_CODE_GODOT)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != REQUEST_CODE_GODOT) return

        val elapsedMs = SystemClock.elapsedRealtime() - launchStartMs
        val resultData = data ?: Intent()

        val hasKnownResult =
            resultData.hasExtra("ritmo_game_completed") ||
            resultData.hasExtra("ritmo_result_code")

        val likelyStartupFailure =
            resultCode == Activity.RESULT_CANCELED &&
            !hasKnownResult &&
            elapsedMs <= STARTUP_FAILURE_WINDOW_MS

        if (likelyStartupFailure) {
            resultData.putExtra("ritmo_startup_failed", true)
        }
        resultData.putExtra("ritmo_startup_elapsed_ms", elapsedMs)

        setResult(resultCode, resultData)
        finish()
        overridePendingTransition(0, 0)
    }

    companion object {
        private const val REQUEST_CODE_GODOT = 9202
        private const val STARTUP_FAILURE_WINDOW_MS = 2500L
    }
}