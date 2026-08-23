package com.mohsendastaran.social-wrapped

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * Edge-to-edge safe area for Android.
 *
 * Primary: pad the activity content root with system bar / cutout / IME insets
 * (LinboLen option 2). This always keeps UI out from under status/nav bars.
 *
 * Secondary: expose `--safe-area-inset-*` as 0 via a JS bridge while native
 * padding is active, so React `<SafeArea>` / CSS `var()` do not double-pad.
 */
class MainActivity : TauriActivity() {
  private var webView: WebView? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  private val safeAreaBridge =
    object {
      @JavascriptInterface
      fun top(): Int = 0

      @JavascriptInterface
      fun right(): Int = 0

      @JavascriptInterface
      fun bottom(): Int = 0

      @JavascriptInterface
      fun left(): Int = 0
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    WindowCompat.setDecorFitsSystemWindows(window, false)
    super.onCreate(savedInstanceState)

    val rootView: View = findViewById(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      val cutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
      val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
      val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom

      val top = maxOf(systemBars.top, cutout.top)
      val right = maxOf(systemBars.right, cutout.right)
      val left = maxOf(systemBars.left, cutout.left)
      val bottom =
        if (imeVisible) {
          imeBottom
        } else {
          maxOf(systemBars.bottom, cutout.bottom)
        }

      v.setPadding(left, top, right, bottom)
      injectSafeAreaCss()
      insets
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    this.webView = webView
    webView.setBackgroundColor(0x00000000)
    webView.addJavascriptInterface(safeAreaBridge, "SocialWrappedSafeArea")

    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      WebViewCompat.addDocumentStartJavaScript(
        webView,
        SAFE_AREA_BOOTSTRAP_JS,
        setOf("*"),
      )
    }

    mainHandler.postDelayed({ injectSafeAreaCss() }, 100)
    mainHandler.postDelayed({ injectSafeAreaCss() }, 500)
    mainHandler.postDelayed({ injectSafeAreaCss() }, 1500)

    ViewCompat.requestApplyInsets(findViewById(android.R.id.content))
  }

  private fun injectSafeAreaCss() {
    val wv = webView ?: return
    wv.evaluateJavascript(SAFE_AREA_ZERO_JS, null)
  }

  companion object {
    private val SAFE_AREA_ZERO_JS =
      """
      (function () {
        var r = document.documentElement && document.documentElement.style;
        if (!r) return;
        r.setProperty('--safe-area-inset-top', '0px');
        r.setProperty('--safe-area-inset-right', '0px');
        r.setProperty('--safe-area-inset-bottom', '0px');
        r.setProperty('--safe-area-inset-left', '0px');
      })();
      """.trimIndent()

    private val SAFE_AREA_BOOTSTRAP_JS =
      """
      (function () {
        try {
          var b = window.SocialWrappedSafeArea;
          var r = document.documentElement.style;
          var t = b ? (b.top() || 0) : 0;
          var right = b ? (b.right() || 0) : 0;
          var bottom = b ? (b.bottom() || 0) : 0;
          var left = b ? (b.left() || 0) : 0;
          r.setProperty('--safe-area-inset-top', t + 'px');
          r.setProperty('--safe-area-inset-right', right + 'px');
          r.setProperty('--safe-area-inset-bottom', bottom + 'px');
          r.setProperty('--safe-area-inset-left', left + 'px');
        } catch (_) {}
      })();
      """.trimIndent()
  }
}
