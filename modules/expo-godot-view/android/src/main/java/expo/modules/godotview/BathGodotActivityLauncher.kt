package expo.modules.godotview

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Dedicated trampoline activity for Bath game so React Native receives a stable startup result.
 */
class BathGodotActivityLauncher : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val launchIntent = Intent(this, BathGodotActivity::class.java).apply {
            putExtras(intent.extras ?: Bundle())
        }
        startActivityForResult(launchIntent, 1)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        setResult(resultCode, data)
        finish()
    }
}
