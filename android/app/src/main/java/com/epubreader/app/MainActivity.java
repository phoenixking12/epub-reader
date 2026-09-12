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
    private boolean insetListenerBound;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(IncomingEpubPlugin.class);
        registerPlugin(VolumeKeysPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        View content = findViewById(android.R.id.content);
        if (content != null) {
            content.setBackgroundColor(Color.parseColor("#1c1917"));
            content.post(this::applySystemBarInsets);
            content.postDelayed(this::applySystemBarInsets, 250);
            content.postDelayed(this::applySystemBarInsets, 1000);
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
        if (insetListenerBound) {
            ViewCompat.requestApplyInsets(webView);
            return;
        }
        insetListenerBound = true;
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets sys = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
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
            float density = Math.max(0.5f, v.getResources().getDisplayMetrics().density);
            int sat = Math.round(sys.top / density);
            int sab = Math.round(sys.bottom / density);
            int keyboard = Math.max(0, Math.round(ime.bottom / density));
            String js =
                    "document.documentElement.style.setProperty('--lg-sat','"
                            + sat
                            + "px');"
                            + "document.documentElement.style.setProperty('--lg-sab','"
                            + sab
                            + "px');"
                            + "document.documentElement.style.setProperty('--lg-keyboard','"
                            + keyboard
                            + "px');";
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
