package com.mohsendastaran.social_wrapped

import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import kotlin.math.roundToInt

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    ViewCompat.setOnApplyWindowInsetsListener(webView) { _, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val displayCutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())

      val density = resources.displayMetrics.density
      val safeTop = maxOf(systemBars.top, displayCutout.top)
      val safeBottom = maxOf(systemBars.bottom, displayCutout.bottom)
      val safeLeft = maxOf(systemBars.left, displayCutout.left)
      val safeRight = maxOf(systemBars.right, displayCutout.right)

      val topDp = (safeTop / density).roundToInt()
      val bottomDp = (safeBottom / density).roundToInt()
      val leftDp = (safeLeft / density).roundToInt()
      val rightDp = (safeRight / density).roundToInt()

      val script =
        """
        document.documentElement.style.setProperty('--safe-area-inset-top', '${topDp}px');
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '${bottomDp}px');
        document.documentElement.style.setProperty('--safe-area-inset-left', '${leftDp}px');
        document.documentElement.style.setProperty('--safe-area-inset-right', '${rightDp}px');
        """.trimIndent()

      webView.evaluateJavascript(script, null)
      insets
    }

    ViewCompat.requestApplyInsets(webView)
  }
}
