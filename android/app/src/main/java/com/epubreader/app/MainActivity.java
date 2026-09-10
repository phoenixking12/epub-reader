package com.epubreader.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.ActionMode;
import android.view.KeyEvent;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingEpubPlugin.class);
        registerPlugin(VolumeKeysPlugin.class);
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#1c1917"));
        getWindow().setNavigationBarColor(Color.parseColor("#1c1917"));
        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(Color.parseColor("#1c1917"));
            content.post(this::applySystemBarInsets);
        } else {
            applySystemBarInsets();
        }
    }

    private void applySystemBarInsets() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        View webView = getBridge().getWebView();
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), webView);
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets status = insets.getInsets(
                    WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout());
            Insets nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            ViewGroup.LayoutParams raw = v.getLayoutParams();
            if (raw instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) raw;
                lp.topMargin = 0;
                lp.bottomMargin = 0;
                lp.leftMargin = 0;
                lp.rightMargin = 0;
                v.setLayoutParams(lp);
            }
            v.setPadding(0, 0, 0, 0);
            // WindowInsets are device pixels. CSS px is devicePx / devicePixelRatio.
            // Writing raw pixels as "72px" triples the gap on a 3x phone.
            float density = v.getResources().getDisplayMetrics().density;
            if (density < 0.5f) density = 1f;
            String js =
                    "(function(){"
                            + "var root=document.documentElement;"
                            + "root.setAttribute('data-lg-sat-px','"
                            + status.top
                            + "');"
                            + "root.setAttribute('data-lg-sab-px','"
                            + nav.bottom
                            + "');"
                            + "var d=window.devicePixelRatio||"
                            + density
                            + ";"
                            + "if(!d||d<0.5)d=1;"
                            + "root.style.setProperty('--lg-sat',("
                            + status.top
                            + "/d)+'px');"
                            + "root.style.setProperty('--lg-sab',("
                            + nav.bottom
                            + "/d)+'px');"
                            + "})()";
            if (v instanceof WebView) {
                ((WebView) v).evaluateJavascript(js, null);
            }
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    @Override
    public void onResume() {
        super.onResume();
        applySystemBarInsets();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && getBridge() != null) {
            PluginHandle handle = getBridge().getPlugin("VolumeKeys");
            if (handle != null && handle.getInstance() instanceof VolumeKeysPlugin) {
                VolumeKeysPlugin plugin = (VolumeKeysPlugin) handle.getInstance();
                if (plugin.handleKey(event.getKeyCode())) {
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onActionModeStarted(ActionMode mode) {
        super.onActionModeStarted(mode);
        if (mode == null || mode.getMenu() == null) return;
        mode.getMenu().clear();
        MenuItem keep = mode.getMenu().add(" ");
        keep.setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER);
        keep.setVisible(false);
        keep.setEnabled(false);
    }
}
